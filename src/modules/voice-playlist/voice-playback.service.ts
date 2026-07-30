import { Injectable, Logger } from '@nestjs/common';
import { MezonClientService } from '@/libs/mezon-client/mezon-client.service';
import { StreamingService } from '@/modules/streaming/streaming.service';
import { SongResolverService } from '@/modules/song-cache/song-resolver.service';
import { VoicePlaylistService, PlaylistSong } from './voice-playlist.service';

@Injectable()
export class VoicePlaybackService {
    private readonly logger = new Logger(VoicePlaybackService.name);
    private readonly skipGuard = new Set<string>();

    constructor(
        private readonly voicePlaylistService: VoicePlaylistService,
        private readonly mezonClientService: MezonClientService,
        private readonly streamingService: StreamingService,
        private readonly songResolverService: SongResolverService,
    ) {}

    async startSession(voiceChannelId: string, clanId: string, channelName: string) {
        const otherSession = await this.voicePlaylistService.findSessionByClanId(clanId);
        if (otherSession && otherSession.voiceChannelId !== voiceChannelId) {
            await this.killSession(otherSession.voiceChannelId);
        }

        await this.voicePlaylistService.setVoiceChannel(clanId, voiceChannelId, channelName);
    }

    async startPlayback(
        clanId: string,
        voiceChannelId: string,
        channelName: string,
        order: number,
    ) {
        const songs = await this.voicePlaylistService.getPlaylistSongs(clanId);
        const song = songs.find((item) => item.order === order && !item.isPlayed);

        if (!song) {
            throw new Error(`Song with order ${order} not found in playlist`);
        }

        const playableSong = await this.ensurePlayableSong(song);

        const botId = process.env.MEZON_BOT_ID as string;
        const botName = process.env.MEZON_BOT_NAME as string;

        await this.mezonClientService.playMediaViaApi({
            clanId,
            voiceChannelId,
            url: playableSong.playableUrl,
            participantIdentity: botId,
            participantName: botName,
            trackName: playableSong.trackName,
        });

        await this.startSession(voiceChannelId, clanId, channelName);
        await this.voicePlaylistService.setCurrentSong(voiceChannelId, order);

        this.logger.log(
            `Đang phát "${playableSong.trackName}" tại ${channelName} (${voiceChannelId})`,
        );
    }

    async playSong(voiceChannelId: string, order: number) {
        const session = await this.voicePlaylistService.getSessionByVoiceChannel(voiceChannelId);
        const song = session?.songs.find((item) => item.order === order);

        if (!session || !song) {
            return;
        }

        const playableSong = await this.ensurePlayableSong(song);

        await this.voicePlaylistService.setCurrentSong(voiceChannelId, order);

        const botId = process.env.MEZON_BOT_ID as string;
        const botName = process.env.MEZON_BOT_NAME as string;

        this.logger.log(
            `Đang phát "${playableSong.trackName}" tại ${session.channelName} (${voiceChannelId})`,
        );

        await this.mezonClientService.playMediaViaApi({
            clanId: session.clanId,
            voiceChannelId,
            url: playableSong.playableUrl,
            participantIdentity: botId,
            participantName: botName,
            trackName: playableSong.trackName,
        });
    }

    async handleSongFinished(voiceChannelId: string) {
        if (this.skipGuard.has(voiceChannelId)) {
            return;
        }

        const session = await this.voicePlaylistService.getSessionByVoiceChannel(voiceChannelId);
        const finishedSong = session?.currentOrder
            ? session.songs.find((song) => song.order === session.currentOrder)
            : undefined;
        const channelLabel = session?.channelName ?? voiceChannelId;

        if (finishedSong && !finishedSong.isPlayed) {
            await this.voicePlaylistService.markSongAsPlayed(finishedSong.id);
            this.logger.log(
                `Đã phát xong "${finishedSong.trackName}" tại ${channelLabel}, bot rời channel`,
            );
        }

        const playedNext = await this.playNextSong(voiceChannelId);
        if (playedNext) {
            const nextSong = await this.voicePlaylistService.getCurrentSong(voiceChannelId);
            this.logger.log(
                `Chuyển sang bài tiếp theo: "${nextSong?.trackName}" tại ${channelLabel}`,
            );
            return;
        }

        this.logger.log(`Hết queue tại ${channelLabel}, dọn session`);
        await this.killSession(voiceChannelId);
    }

    async killSession(voiceChannelId: string) {
        await this.voicePlaylistService.clearPlaybackState(voiceChannelId);
    }

    async skipCurrentSong(voiceChannelId: string) {
        const session = await this.voicePlaylistService.getSessionByVoiceChannel(voiceChannelId);
        if (!session) {
            return { playedSong: undefined, nextSong: undefined };
        }

        this.skipGuard.add(voiceChannelId);
        this.streamingService.stopStreaming({ ChannelId: voiceChannelId });

        try {
            const result = await this.voicePlaylistService.markCurrentSongAsPlayed(voiceChannelId);

            if (result.nextSong) {
                await this.playSong(voiceChannelId, result.nextSong.order);
            } else {
                await this.killSession(voiceChannelId);
            }

            return result;
        } finally {
            setTimeout(() => this.skipGuard.delete(voiceChannelId), 3000);
        }
    }

    async playNextSong(voiceChannelId: string): Promise<boolean> {
        const session = await this.voicePlaylistService.getSessionByVoiceChannel(voiceChannelId);
        if (!session?.currentOrder) {
            return false;
        }

        const nextSong = await this.voicePlaylistService.getNextUnplayedSong(
            voiceChannelId,
            session.currentOrder,
        );
        if (!nextSong) {
            return false;
        }

        try {
            await this.playSong(voiceChannelId, nextSong.order);
            return true;
        } catch (error) {
            this.logger.error(`Failed to play next song in channel ${voiceChannelId}`, error);
            return false;
        }
    }

    private async ensurePlayableSong(song: PlaylistSong): Promise<PlaylistSong> {
        if (song.playableUrl) {
            return song;
        }

        const resolved = await this.songResolverService.resolve(song.songUrl);
        return {
            ...song,
            playableUrl: resolved.playableUrl,
            trackName: resolved.trackInfo.trackName,
            thumbnailUrl: resolved.trackInfo.thumbnailUrl,
            authorName: resolved.trackInfo.authorName,
            durationSeconds: resolved.trackInfo.durationSeconds,
        };
    }
}
