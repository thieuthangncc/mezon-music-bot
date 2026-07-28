import { Injectable } from '@nestjs/common';
import { BotCommand, CommandContext } from '../command.interface';
import { MezonClientService } from '@/libs/mezon-client/mezon-client.service';
import { PrismaService } from '@/libs/prisma/prisma.service';
import { MiscService } from '@/modules/misc/misc.service';
import { getTextMessage } from '@/utils';

@Injectable()
export class RequestCommand implements BotCommand {
    name = 'req';
    isPublic = true;

    constructor(
        private readonly mcService: MezonClientService,
        private readonly prismaService: PrismaService,
        private readonly miscService: MiscService,
    ) {}

    async execute(ctx: CommandContext) {
        const { event, repliedMessage, args } = ctx;

        try {
            const songUrl = args[0];
            if (!songUrl) {
                await this.mcService.updateMessage(
                    repliedMessage,
                    getTextMessage('Please provide a song link. Usage: `*dj req <link>`'),
                );
                return;
            }

            const clanId = event.clan_id as string;

            const clan = await this.prismaService.clan.findUnique({
                where: { id: clanId },
                include: {
                    playlist: {
                        include: {
                            songs: {
                                orderBy: { order: 'desc' },
                                take: 1,
                            },
                        },
                    },
                },
            });

            if (!clan) {
                await this.mcService.updateMessage(
                    repliedMessage,
                    getTextMessage('Clan is not set up yet. Please use `*dj setup` first.'),
                );
                return;
            }

            const playlist = clan.playlist;
            if (!playlist) {
                await this.mcService.updateMessage(
                    repliedMessage,
                    getTextMessage('No playlist found. Please use `*dj setup` to create a playlist.'),
                );
                return;
            }

            const nextOrder = playlist.songs.length > 0 ? playlist.songs[0].order + 1 : 1;

            await this.prismaService.playlistSong.create({
                data: {
                    id: `${playlist.id}-song-${nextOrder}`,
                    playlistId: playlist.id,
                    songUrl,
                    order: nextOrder,
                },
            });

            await this.mcService.updateMessage(
                repliedMessage,
                getTextMessage(`Song added to playlist (#${nextOrder}). Link: ${songUrl}`),
            );
        } catch (error) {
            console.error('❌ Lỗi khi thực hiện lệnh `req`:', error);
            await this.miscService.handleCommandError(ctx);
        }
    }
}
