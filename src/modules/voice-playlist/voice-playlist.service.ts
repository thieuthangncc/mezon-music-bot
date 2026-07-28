import { Injectable } from '@nestjs/common';
import { TrackInfo } from '@/utils/youtube.util';

export interface PlaylistSong {
    songUrl: string;
    playableUrl: string;
    trackName: string;
    thumbnailUrl?: string;
    authorName?: string;
    durationSeconds?: number;
    requestedBy: string;
    order: number;
}

export interface VoiceSession {
    voiceChannelId: string;
    clanId: string;
    channelName: string;
    songs: PlaylistSong[];
    currentOrder?: number;
    startedAt?: number;
}

export interface PlaybackProgress {
    elapsedSeconds: number;
    progressPercent: number;
}

@Injectable()
export class VoicePlaylistService {
    private activeSessions = new Map<string, VoiceSession>();

    getSession(voiceChannelId: string) {
        return this.activeSessions.get(voiceChannelId);
    }

    findSessionByClanId(clanId: string) {
        for (const session of this.activeSessions.values()) {
            if (session.clanId === clanId) {
                return session;
            }
        }
        return undefined;
    }

    startSession(voiceChannelId: string, clanId: string, channelName: string): VoiceSession {
        const existing = this.activeSessions.get(voiceChannelId);
        if (existing) {
            return existing;
        }

        const session: VoiceSession = {
            voiceChannelId,
            clanId,
            channelName,
            songs: [],
        };

        this.activeSessions.set(voiceChannelId, session);
        return session;
    }

    addSong(
        voiceChannelId: string,
        songUrl: string,
        playableUrl: string,
        trackInfo: TrackInfo,
        requestedBy: string,
    ): PlaylistSong {
        const session = this.activeSessions.get(voiceChannelId);
        if (!session) {
            throw new Error('No active voice playlist session.');
        }

        const order = session.songs.length + 1;
        const song: PlaylistSong = {
            songUrl,
            playableUrl,
            trackName: trackInfo.trackName,
            thumbnailUrl: trackInfo.thumbnailUrl,
            authorName: trackInfo.authorName,
            durationSeconds: trackInfo.durationSeconds,
            requestedBy,
            order,
        };
        session.songs.push(song);
        return song;
    }

    setCurrentSong(voiceChannelId: string, order: number) {
        const session = this.activeSessions.get(voiceChannelId);
        if (!session) {
            return;
        }

        session.currentOrder = order;
        session.startedAt = Date.now();
    }

    getCurrentSong(voiceChannelId: string): PlaylistSong | undefined {
        const session = this.activeSessions.get(voiceChannelId);
        if (!session || session.songs.length === 0) {
            return undefined;
        }

        const currentOrder = session.currentOrder ?? session.songs[0].order;
        return session.songs.find((song) => song.order === currentOrder);
    }

    getPreviousSong(voiceChannelId: string, currentOrder: number): PlaylistSong | undefined {
        const session = this.activeSessions.get(voiceChannelId);
        return session?.songs.find((song) => song.order === currentOrder - 1);
    }

    getNextSong(voiceChannelId: string, currentOrder: number): PlaylistSong | undefined {
        const session = this.activeSessions.get(voiceChannelId);
        return session?.songs.find((song) => song.order === currentOrder + 1);
    }

    skipCurrentSong(voiceChannelId: string): {
        removedSong?: PlaylistSong;
        nextSong?: PlaylistSong;
    } {
        const session = this.activeSessions.get(voiceChannelId);
        if (!session || session.songs.length === 0) {
            return {};
        }

        const currentOrder = session.currentOrder ?? session.songs[0]?.order;
        const currentIndex = session.songs.findIndex((song) => song.order === currentOrder);
        if (currentIndex < 0) {
            return {};
        }

        const [removedSong] = session.songs.splice(currentIndex, 1);

        session.songs.forEach((song, index) => {
            song.order = index + 1;
        });

        const nextSong = session.songs[currentIndex];
        session.currentOrder = nextSong?.order;
        session.startedAt = nextSong ? Date.now() : undefined;

        return {
            removedSong,
            nextSong,
        };
    }

    getPlaybackProgress(voiceChannelId: string): PlaybackProgress | null {
        const session = this.activeSessions.get(voiceChannelId);
        const currentSong = this.getCurrentSong(voiceChannelId);

        if (!session?.startedAt || !currentSong) {
            return null;
        }

        const elapsedSeconds = Math.max(0, Math.floor((Date.now() - session.startedAt) / 1000));

        if (!currentSong.durationSeconds) {
            return { elapsedSeconds, progressPercent: 0 };
        }

        const progressPercent = Math.min(
            100,
            Math.round((elapsedSeconds / currentSong.durationSeconds) * 100),
        );

        return { elapsedSeconds, progressPercent };
    }

    songToTrackInfo(song: PlaylistSong): TrackInfo {
        return {
            trackName: song.trackName,
            thumbnailUrl: song.thumbnailUrl,
            authorName: song.authorName,
            durationSeconds: song.durationSeconds,
        };
    }

    getTopSongs(clanId: string, limit = 20): PlaylistSong[] {
        const session = this.findSessionByClanId(clanId);
        if (!session) {
            return [];
        }

        return session.songs.slice(0, limit);
    }

    killSession(voiceChannelId: string) {
        return this.activeSessions.delete(voiceChannelId);
    }
}
