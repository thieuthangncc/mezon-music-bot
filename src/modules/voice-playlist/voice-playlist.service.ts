import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/libs/prisma/prisma.service';
import { TrackInfo } from '@/utils/youtube.util';
import { CachedSong, PlaylistSong as DbPlaylistSong } from '@/_generated/prisma/client';

const songInclude = { cachedSong: true } as const;

type DbPlaylistSongWithCache = DbPlaylistSong & { cachedSong: CachedSong };

export interface PlaylistSong {
    id: string;
    cachedSongId: string;
    songUrl: string;
    playableUrl: string;
    trackName: string;
    thumbnailUrl?: string;
    authorName?: string;
    durationSeconds?: number;
    requestedBy: string;
    order: number;
    isPlayed: boolean;
}

export interface VoiceSession {
    voiceChannelId: string;
    clanId: string;
    channelName: string;
    songs: PlaylistSong[];
    currentOrder?: number;
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
                songs: { orderBy: { order: 'asc' }, include: songInclude },
            },
        });

        if (!playlist?.voiceChannelId) {
            return undefined;
        }

        return this.toSession(playlist);
    }

    async isPlaying(clanId: string): Promise<boolean> {
        const playlist = await this.prisma.playlist.findUnique({ where: { clanId } });
        return !!(playlist?.voiceChannelId && playlist.currentOrder);
    }

    async getSessionByVoiceChannel(voiceChannelId: string): Promise<VoiceSession | undefined> {
        const playlist = await this.prisma.playlist.findFirst({
            where: { voiceChannelId },
            include: {
                songs: { orderBy: { order: 'asc' }, include: songInclude },
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
        cachedSongId: string,
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
                cachedSongId,
                requestedBy,
                order,
            },
            include: songInclude,
        });

        return this.mapSong(created);
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
        const song = await this.prisma.playlistSong.findFirst({
            where: {
                playlist: { clanId },
                order: currentOrder - 1,
            },
            include: songInclude,
        });

        return song ? this.mapSong(song) : undefined;
    }

    async getNextUnplayedSongByClanId(
        clanId: string,
        afterOrder: number,
    ): Promise<PlaylistSong | undefined> {
        const song = await this.prisma.playlistSong.findFirst({
            where: {
                playlist: { clanId },
                isPlayed: false,
                order: { gt: afterOrder },
            },
            orderBy: { order: 'asc' },
            include: songInclude,
        });

        return song ? this.mapSong(song) : undefined;
    }

    async getFirstUnplayedSong(clanId: string): Promise<PlaylistSong | undefined> {
        const song = await this.prisma.playlistSong.findFirst({
            where: {
                playlist: { clanId },
                isPlayed: false,
            },
            orderBy: { order: 'asc' },
            include: songInclude,
        });

        return song ? this.mapSong(song) : undefined;
    }

    async resolvePlayStartSong(clanId: string): Promise<PlaylistSong | undefined> {
        const firstUnplayed = await this.getFirstUnplayedSong(clanId);
        if (firstUnplayed) {
            return firstUnplayed;
        }

        const playlist = await this.prisma.playlist.findUnique({
            where: { clanId },
            include: {
                songs: { orderBy: { order: 'asc' }, take: 1, include: songInclude },
            },
        });

        if (!playlist?.songs.length) {
            return undefined;
        }

        await this.prisma.playlistSong.updateMany({
            where: { playlistId: playlist.id },
            data: { isPlayed: false },
        });

        return this.mapSong(playlist.songs[0]);
    }

    async getPreviousSong(voiceChannelId: string, currentOrder: number): Promise<PlaylistSong | undefined> {
        const session = await this.getSessionByVoiceChannel(voiceChannelId);
        return session?.songs.find((song) => song.order === currentOrder - 1);
    }

    async getNextUnplayedSong(
        voiceChannelId: string,
        afterOrder: number,
    ): Promise<PlaylistSong | undefined> {
        const session = await this.getSessionByVoiceChannel(voiceChannelId);
        return session?.songs.find((song) => !song.isPlayed && song.order > afterOrder);
    }

    async markCurrentSongAsPlayed(voiceChannelId: string): Promise<{
        playedSong?: PlaylistSong;
        nextSong?: PlaylistSong;
    }> {
        const playlist = await this.prisma.playlist.findFirst({
            where: { voiceChannelId },
            include: {
                songs: { orderBy: { order: 'asc' }, include: songInclude },
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

        const currentDbSong = playlist.songs[currentIndex];
        const playedDbSong = await this.prisma.playlistSong.update({
            where: { id: currentDbSong.id },
            data: { isPlayed: true },
            include: songInclude,
        });

        const nextDbSong = playlist.songs.find(
            (song) => !song.isPlayed && song.id !== currentDbSong.id && song.order > currentOrder,
        );

        return {
            playedSong: this.mapSong(playedDbSong),
            nextSong: nextDbSong ? this.mapSong(nextDbSong) : undefined,
        };
    }

    async markSongAsPlayed(songId: string): Promise<PlaylistSong> {
        const updated = await this.prisma.playlistSong.update({
            where: { id: songId },
            data: { isPlayed: true },
            include: songInclude,
        });

        return this.mapSong(updated);
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
                    include: songInclude,
                },
            },
        });

        return playlist?.songs.map((song) => this.mapSong(song)) ?? [];
    }

    async getUnplayedSongCount(clanId: string): Promise<number> {
        const playlist = await this.prisma.playlist.findUnique({ where: { clanId } });
        if (!playlist) {
            return 0;
        }

        return this.prisma.playlistSong.count({
            where: { playlistId: playlist.id, isPlayed: false },
        });
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
                songs: { orderBy: { order: 'asc' }, include: songInclude },
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
            },
        });
    }

    async cleanPlayedSongs(clanId: string): Promise<number> {
        const playlist = await this.prisma.playlist.findUnique({ where: { clanId } });
        if (!playlist) {
            return 0;
        }

        const result = await this.prisma.playlistSong.deleteMany({
            where: { playlistId: playlist.id, isPlayed: true },
        });

        return result.count;
    }

    async clearAllSongs(clanId: string): Promise<number> {
        const playlist = await this.prisma.playlist.findUnique({ where: { clanId } });
        if (!playlist) {
            return 0;
        }

        const result = await this.prisma.playlistSong.deleteMany({
            where: { playlistId: playlist.id },
        });

        await this.prisma.playlist.update({
            where: { id: playlist.id },
            data: {
                currentOrder: null,
                voiceChannelId: null,
                voiceChannelName: null,
            },
        });

        return result.count;
    }

    private toSession(
        playlist: {
            clanId: string;
            voiceChannelId: string | null;
            voiceChannelName: string | null;
            currentOrder: number | null;
            songs: DbPlaylistSongWithCache[];
        },
    ): VoiceSession {
        return {
            voiceChannelId: playlist.voiceChannelId as string,
            clanId: playlist.clanId,
            channelName: playlist.voiceChannelName ?? playlist.voiceChannelId ?? '',
            songs: playlist.songs.map((song) => this.mapSong(song)),
            currentOrder: playlist.currentOrder ?? undefined,
        };
    }

    private mapSong(song: DbPlaylistSongWithCache): PlaylistSong {
        return {
            id: song.id,
            cachedSongId: song.cachedSongId,
            songUrl: song.cachedSong.youtubeUrl,
            playableUrl: song.cachedSong.oggUrl,
            trackName: song.cachedSong.title,
            thumbnailUrl: song.cachedSong.thumbnailUrl ?? undefined,
            authorName: song.cachedSong.authorName ?? undefined,
            durationSeconds: song.cachedSong.durationSeconds ?? undefined,
            requestedBy: song.requestedBy ?? 'Unknown',
            order: song.order,
            isPlayed: song.isPlayed,
        };
    }
}
