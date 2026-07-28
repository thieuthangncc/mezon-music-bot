import { Injectable, Logger } from '@nestjs/common';
import { MezonClientService } from '@/libs/mezon-client/mezon-client.service';
import { StreamingService } from '@/modules/streaming/streaming.service';
import { SongResolverService } from '@/modules/song-cache/song-resolver.service';
import { VoicePlaylistService } from './voice-playlist.service';

@Injectable()
export class VoicePlaybackService {
    private readonly logger = new Logger(VoicePlaybackService.name);

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
        const voiceChannel = await this.mezonClientService
            .getClient()
            .channels.fetch(voiceChannelId);

        await voiceChannel.playMedia(
            playableSong.playableUrl,
            botId,
            botName,
            playableSong.trackName,
        );
    }

    async killSession(voiceChannelId: string) {
        await this.voicePlaylistService.clearPlaybackState(voiceChannelId);
    }

    async skipCurrentSong(voiceChannelId: string) {
        const session = await this.voicePlaylistService.getSessionByVoiceChannel(voiceChannelId);
        if (!session) {
            return { removedSong: undefined, nextSong: undefined };
        }

        this.streamingService.stopStreaming({ ChannelId: voiceChannelId });

        const result = await this.voicePlaylistService.skipCurrentSong(voiceChannelId);

        if (result.nextSong) {
            await this.playSong(voiceChannelId, result.nextSong.order);
        }

        return result;
    }

    async playNextSong(voiceChannelId: string): Promise<boolean> {
        const session = await this.voicePlaylistService.getSessionByVoiceChannel(voiceChannelId);
        if (!session?.currentOrder) {
            return false;
        }

        const nextSong = await this.voicePlaylistService.getNextSong(
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

    private async ensurePlayableSong(song: {
        id: string;
        songUrl: string;
        playableUrl: string;
        trackName: string;
    }) {
        if (song.playableUrl) {
            return song;
        }

        const resolved = await this.songResolverService.resolve(song.songUrl);
        return this.voicePlaylistService.updateSongFromResolved(song.id, {
            songUrl: resolved.youtubeUrl,
            playableUrl: resolved.playableUrl,
            trackInfo: resolved.trackInfo,
        });
    }
}
