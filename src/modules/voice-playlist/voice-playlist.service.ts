import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/libs/prisma/prisma.service';
import { TrackInfo } from '@/utils/youtube.util';
import type { PlaylistSong as DbPlaylistSong } from '@/_generated/prisma/client';

export interface PlaylistSong {
    id: string;
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
    constructor(private readonly prisma: PrismaService) {}

    async ensurePlaylist(clanId: string) {
        const existing = await this.prisma.playlist.findUnique({ where: { clanId } });
        if (existing) {
            return existing;
        }

        return this.prisma.playlist.create({
            data: {
                id: `${clanId}-playlist`,
                clanId,
            },
        });
    }

    async findSessionByClanId(clanId: string): Promise<VoiceSession | undefined> {
        const playlist = await this.prisma.playlist.findUnique({
            where: { clanId },
            include: {
                songs: { orderBy: { order: 'asc' } },
            },
        });

        if (!playlist?.voiceChannelId) {
            return undefined;
        }

        return this.toSession(playlist);
    }

    async getSessionByVoiceChannel(voiceChannelId: string): Promise<VoiceSession | undefined> {
        const playlist = await this.prisma.playlist.findFirst({
            where: { voiceChannelId },
            include: {
                songs: { orderBy: { order: 'asc' } },
            },
        });

        if (!playlist) {
            return undefined;
        }

        return this.toSession(playlist);
    }

    async setVoiceChannel(clanId: string, voiceChannelId: string, channelName: string) {
        await this.ensurePlaylist(clanId);

        await this.prisma.playlist.update({
            where: { clanId },
            data: {
                voiceChannelId,
                voiceChannelName: channelName,
            },
        });
    }

    async addSong(
        clanId: string,
        songUrl: string,
        playableUrl: string,
        trackInfo: TrackInfo,
        requestedBy: string,
    ): Promise<PlaylistSong> {
        const playlist = await this.ensurePlaylist(clanId);

        const lastSong = await this.prisma.playlistSong.findFirst({
            where: { playlistId: playlist.id },
            orderBy: { order: 'desc' },
        });

        const order = (lastSong?.order ?? 0) + 1;

        const created = await this.prisma.playlistSong.create({
            data: {
                id: `${playlist.id}-song-${order}`,
                playlistId: playlist.id,
                songUrl,
                playableUrl,
                title: trackInfo.trackName,
                thumbnailUrl: trackInfo.thumbnailUrl,
                authorName: trackInfo.authorName,
                durationSeconds: trackInfo.durationSeconds,
                requestedBy,
                order,
            },
        });

        return this.mapSong(created);
    }

    async updateSongFromResolved(
        songId: string,
        data: {
            songUrl: string;
            playableUrl: string;
            trackInfo: TrackInfo;
        },
    ) {
        const updated = await this.prisma.playlistSong.update({
            where: { id: songId },
            data: {
                songUrl: data.songUrl,
                playableUrl: data.playableUrl,
                title: data.trackInfo.trackName,
                thumbnailUrl: data.trackInfo.thumbnailUrl,
                authorName: data.trackInfo.authorName,
                durationSeconds: data.trackInfo.durationSeconds,
            },
        });

        return this.mapSong(updated);
    }

    async setCurrentSong(voiceChannelId: string, order: number) {
        const playlist = await this.prisma.playlist.findFirst({
            where: { voiceChannelId },
        });

        if (!playlist) {
            return;
        }

        await this.prisma.playlist.update({
            where: { id: playlist.id },
            data: {
                currentOrder: order,
                playbackStartedAt: new Date(),
            },
        });
    }

    async getCurrentSong(voiceChannelId: string): Promise<PlaylistSong | undefined> {
        const session = await this.getSessionByVoiceChannel(voiceChannelId);
        if (!session || session.songs.length === 0) {
            return undefined;
        }

        const currentOrder = session.currentOrder ?? session.songs[0].order;
        return session.songs.find((song) => song.order === currentOrder);
    }

    async getPreviousSongByClanId(clanId: string, currentOrder: number): Promise<PlaylistSong | undefined> {
        const playlist = await this.prisma.playlist.findUnique({
            where: { clanId },
            include: {
                songs: { orderBy: { order: 'asc' } },
            },
        });

        return playlist?.songs
            .map((song) => this.mapSong(song))
            .find((song) => song.order === currentOrder - 1);
    }

    async getNextSongByClanId(clanId: string, currentOrder: number): Promise<PlaylistSong | undefined> {
        const playlist = await this.prisma.playlist.findUnique({
            where: { clanId },
            include: {
                songs: { orderBy: { order: 'asc' } },
            },
        });

        return playlist?.songs
            .map((song) => this.mapSong(song))
            .find((song) => song.order === currentOrder + 1);
    }

    async getPreviousSong(voiceChannelId: string, currentOrder: number): Promise<PlaylistSong | undefined> {
        const session = await this.getSessionByVoiceChannel(voiceChannelId);
        return session?.songs.find((song) => song.order === currentOrder - 1);
    }

    async getNextSong(voiceChannelId: string, currentOrder: number): Promise<PlaylistSong | undefined> {
        const session = await this.getSessionByVoiceChannel(voiceChannelId);
        return session?.songs.find((song) => song.order === currentOrder + 1);
    }

    async skipCurrentSong(voiceChannelId: string): Promise<{
        removedSong?: PlaylistSong;
        nextSong?: PlaylistSong;
    }> {
        const playlist = await this.prisma.playlist.findFirst({
            where: { voiceChannelId },
            include: {
                songs: { orderBy: { order: 'asc' } },
            },
        });

        if (!playlist || playlist.songs.length === 0) {
            return {};
        }

        const currentOrder = playlist.currentOrder ?? playlist.songs[0]?.order;
        const currentIndex = playlist.songs.findIndex((song) => song.order === currentOrder);
        if (currentIndex < 0) {
            return {};
        }

        const removedDbSong = playlist.songs[currentIndex];
        await this.prisma.playlistSong.delete({ where: { id: removedDbSong.id } });

        const remaining = playlist.songs.filter((song) => song.id !== removedDbSong.id);
        await Promise.all(
            remaining.map((song, index) =>
                this.prisma.playlistSong.update({
                    where: { id: song.id },
                    data: { order: index + 1 },
                }),
            ),
        );

        const nextDbSong = remaining[currentIndex];
        await this.prisma.playlist.update({
            where: { id: playlist.id },
            data: {
                currentOrder: nextDbSong?.order ?? null,
                playbackStartedAt: nextDbSong ? new Date() : null,
            },
        });

        const removedSong = this.mapSong(removedDbSong);
        const nextSong = nextDbSong ? this.mapSong({ ...nextDbSong, order: currentIndex + 1 }) : undefined;

        return { removedSong, nextSong };
    }

    async getPlaybackProgress(voiceChannelId: string): Promise<PlaybackProgress | null> {
        const playlist = await this.prisma.playlist.findFirst({
            where: { voiceChannelId },
        });
        const currentSong = await this.getCurrentSong(voiceChannelId);

        if (!playlist?.playbackStartedAt || !currentSong) {
            return null;
        }

        const elapsedSeconds = Math.max(
            0,
            Math.floor((Date.now() - playlist.playbackStartedAt.getTime()) / 1000),
        );

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

    async getSongsByClanId(clanId: string, limit = 20): Promise<PlaylistSong[]> {
        const playlist = await this.prisma.playlist.findUnique({
            where: { clanId },
            include: {
                songs: {
                    orderBy: { order: 'asc' },
                    take: limit,
                },
            },
        });

        return playlist?.songs.map((song) => this.mapSong(song)) ?? [];
    }

    async getSongCount(clanId: string): Promise<number> {
        const playlist = await this.prisma.playlist.findUnique({ where: { clanId } });
        if (!playlist) {
            return 0;
        }

        return this.prisma.playlistSong.count({ where: { playlistId: playlist.id } });
    }

    async getPlaylistSongs(clanId: string): Promise<PlaylistSong[]> {
        const playlist = await this.prisma.playlist.findUnique({
            where: { clanId },
            include: {
                songs: { orderBy: { order: 'asc' } },
            },
        });

        if (!playlist) {
            throw new NotFoundException('Playlist not found. Use `*dj setup` first.');
        }

        return playlist.songs.map((song) => this.mapSong(song));
    }

    async clearPlaybackState(voiceChannelId: string) {
        const playlist = await this.prisma.playlist.findFirst({
            where: { voiceChannelId },
        });

        if (!playlist) {
            return;
        }

        await this.prisma.playlist.update({
            where: { id: playlist.id },
            data: {
                voiceChannelId: null,
                voiceChannelName: null,
                currentOrder: null,
                playbackStartedAt: null,
            },
        });
    }

    async clearPlaylist(clanId: string) {
        const playlist = await this.prisma.playlist.findUnique({ where: { clanId } });
        if (!playlist) {
            return;
        }

        await this.prisma.$transaction([
            this.prisma.playlistSong.deleteMany({ where: { playlistId: playlist.id } }),
            this.prisma.playlist.update({
                where: { id: playlist.id },
                data: {
                    voiceChannelId: null,
                    voiceChannelName: null,
                    currentOrder: null,
                    playbackStartedAt: null,
                },
            }),
        ]);
    }

    private toSession(
        playlist: {
            clanId: string;
            voiceChannelId: string | null;
            voiceChannelName: string | null;
            currentOrder: number | null;
            playbackStartedAt: Date | null;
            songs: DbPlaylistSong[];
        },
    ): VoiceSession {
        return {
            voiceChannelId: playlist.voiceChannelId as string,
            clanId: playlist.clanId,
            channelName: playlist.voiceChannelName ?? playlist.voiceChannelId ?? '',
            songs: playlist.songs.map((song) => this.mapSong(song)),
            currentOrder: playlist.currentOrder ?? undefined,
            startedAt: playlist.playbackStartedAt?.getTime(),
        };
    }

    private mapSong(song: DbPlaylistSong): PlaylistSong {
        return {
            id: song.id,
            songUrl: song.songUrl,
            playableUrl: song.playableUrl ?? '',
            trackName: song.title ?? song.songUrl,
            thumbnailUrl: song.thumbnailUrl ?? undefined,
            authorName: song.authorName ?? undefined,
            durationSeconds: song.durationSeconds ?? undefined,
            requestedBy: song.requestedBy ?? 'Unknown',
            order: song.order,
        };
    }
}
