import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { MezonClientService } from '@/libs/mezon-client/mezon-client.service';
import { StreamingService } from '@/modules/streaming/streaming.service';
import { VoicePlaylistService } from './voice-playlist.service';

const DEFAULT_SONG_DURATION_SECONDS = 180;
const ADVANCE_BUFFER_MS = 2_000;

@Injectable()
export class VoicePlaybackService implements OnModuleDestroy {
    private readonly logger = new Logger(VoicePlaybackService.name);
    private readonly advanceTimers = new Map<string, NodeJS.Timeout>();

    constructor(
        private readonly voicePlaylistService: VoicePlaylistService,
        private readonly mezonClientService: MezonClientService,
        private readonly streamingService: StreamingService,
    ) {}

    startSession(voiceChannelId: string, clanId: string, channelName: string) {
        const otherSession = this.voicePlaylistService.findSessionByClanId(clanId);
        if (otherSession && otherSession.voiceChannelId !== voiceChannelId) {
            this.killSession(otherSession.voiceChannelId);
        }

        return this.voicePlaylistService.startSession(voiceChannelId, clanId, channelName);
    }

    async playSong(voiceChannelId: string, order: number) {
        const session = this.voicePlaylistService.getSession(voiceChannelId);
        const song = session?.songs.find((item) => item.order === order);

        if (!session || !song) {
            return;
        }

        this.clearAdvanceTimer(voiceChannelId);
        this.voicePlaylistService.setCurrentSong(voiceChannelId, order);

        const botId = process.env.MEZON_BOT_ID as string;
        const botName = process.env.MEZON_BOT_NAME as string;
        const voiceChannel = await this.mezonClientService
            .getClient()
            .channels.fetch(voiceChannelId);

        await voiceChannel.playMedia(song.playableUrl, botId, botName, song.trackName);
        this.scheduleAdvance(voiceChannelId);
    }

    killSession(voiceChannelId: string) {
        this.clearAdvanceTimer(voiceChannelId);
        this.voicePlaylistService.killSession(voiceChannelId);
    }

    isAdvanceScheduled(voiceChannelId: string): boolean {
        return this.advanceTimers.has(voiceChannelId);
    }

    async skipCurrentSong(voiceChannelId: string) {
        const session = this.voicePlaylistService.getSession(voiceChannelId);
        if (!session) {
            return { removedSong: undefined, nextSong: undefined };
        }

        this.clearAdvanceTimer(voiceChannelId);
        this.streamingService.stopStreaming({ ChannelId: voiceChannelId });

        const result = this.voicePlaylistService.skipCurrentSong(voiceChannelId);

        if (result.nextSong) {
            await this.playSong(voiceChannelId, result.nextSong.order);
        }

        return result;
    }

    onModuleDestroy() {
        for (const voiceChannelId of this.advanceTimers.keys()) {
            this.clearAdvanceTimer(voiceChannelId);
        }
    }

    private scheduleAdvance(voiceChannelId: string) {
        const currentSong = this.voicePlaylistService.getCurrentSong(voiceChannelId);
        if (!currentSong) {
            return;
        }

        const durationSeconds = currentSong.durationSeconds ?? DEFAULT_SONG_DURATION_SECONDS;
        const delayMs = durationSeconds * 1000 + ADVANCE_BUFFER_MS;

        const timer = setTimeout(() => {
            this.advanceTimers.delete(voiceChannelId);
            void this.advanceToNext(voiceChannelId);
        }, delayMs);

        this.advanceTimers.set(voiceChannelId, timer);
    }

    private async advanceToNext(voiceChannelId: string) {
        const session = this.voicePlaylistService.getSession(voiceChannelId);
        if (!session?.currentOrder) {
            return;
        }

        const nextSong = this.voicePlaylistService.getNextSong(
            voiceChannelId,
            session.currentOrder,
        );

        if (!nextSong) {
            return;
        }

        try {
            await this.playSong(voiceChannelId, nextSong.order);
        } catch (error) {
            this.logger.error(`Failed to play next song in channel ${voiceChannelId}`, error);
        }
    }

    private clearAdvanceTimer(voiceChannelId: string) {
        const timer = this.advanceTimers.get(voiceChannelId);
        if (!timer) {
            return;
        }

        clearTimeout(timer);
        this.advanceTimers.delete(voiceChannelId);
    }
}
