import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/libs/prisma/prisma.service';

@Injectable()
export class RoomService {
    constructor(private readonly prisma: PrismaService) {}

    async getRooms() {
        return this.prisma.streamingChannel.findMany({
            where: { isPrivate: false },
            include: {
                clan: { include: { owner: true } },
                members: {
                    include: { user: true },
                    orderBy: { joinedAt: 'asc' },
                },
                playlist: {
                    include: { songs: { orderBy: { order: 'asc' }, take: 1 } },
                    take: 1,
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async getRoom(roomId: string) {
        const channel = await this.prisma.streamingChannel.findUnique({
            where: { id: roomId },
            include: {
                clan: {
                    include: { owner: true },
                },
                members: {
                    include: { user: true },
                    orderBy: { joinedAt: 'asc' },
                },
                playlist: {
                    include: {
                        songs: { orderBy: { order: 'asc' } },
                    },
                },
            },
        });

        if (!channel) {
            throw new NotFoundException('Room not found');
        }

        return channel;
    }

    async joinRoom(roomId: string, userId: string) {
        const channel = await this.prisma.streamingChannel.findUnique({
            where: { id: roomId },
        });

        if (!channel) {
            throw new NotFoundException('Room not found');
        }

        const existing = await this.prisma.roomMember.findUnique({
            where: {
                userId_streamingChannelId: { userId, streamingChannelId: roomId },
            },
        });

        if (existing) {
            throw new ConflictException('User already joined this room');
        }

        const id = `${userId}-${roomId}`;

        return this.prisma.roomMember.create({
            data: { id, userId, streamingChannelId: roomId },
            include: { user: true },
        });
    }

    async leaveRoom(roomId: string, userId: string) {
        const member = await this.prisma.roomMember.findUnique({
            where: {
                userId_streamingChannelId: { userId, streamingChannelId: roomId },
            },
        });

        if (!member) {
            throw new NotFoundException('User is not a member of this room');
        }

        return this.prisma.roomMember.delete({
            where: { id: member.id },
        });
    }

    async addSong(roomId: string, songUrl: string, songFileName?: string) {
        const channel = await this.prisma.streamingChannel.findUnique({
            where: { id: roomId },
        });

        if (!channel) {
            throw new NotFoundException('Room not found');
        }

        let playlist = await this.prisma.playlist.findFirst({
            where: { streamingChannelId: roomId },
        });

        if (!playlist) {
            playlist = await this.prisma.playlist.create({
                data: {
                    id: `${roomId}-playlist`,
                    streamingChannelId: roomId,
                },
            });
        }

        const lastSong = await this.prisma.playlistSong.findFirst({
            where: { playlistId: playlist.id },
            orderBy: { order: 'desc' },
        });

        const order = (lastSong?.order ?? 0) + 1;

        const songId = `${roomId}-song-${order}`;

        return this.prisma.playlistSong.create({
            data: {
                id: songId,
                playlistId: playlist.id,
                songUrl,
                songFileName,
                order,
            },
            include: { playlist: true },
        });
    }
}
