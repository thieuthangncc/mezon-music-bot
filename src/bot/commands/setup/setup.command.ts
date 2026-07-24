import { Injectable } from '@nestjs/common';
import { BotCommand, CommandContext } from '../command.interface';
import { MezonClientService } from '@/libs/mezon-client/mezon-client.service';
import { PrismaService } from '@/libs/prisma/prisma.service';
import { MiscService } from '@/modules/misc/misc.service';
import { getTextMessage } from '@/utils';

@Injectable()
export class SetupCommand implements BotCommand {
    name = 'setup';
    isPublic = true;

    constructor(
        private readonly mezonClientService: MezonClientService,
        private readonly prismaService: PrismaService,
        private readonly miscService: MiscService,
    ) {}

    async execute(ctx: CommandContext) {
        const { event, repliedMessage, args } = ctx;

        try {
            const streamingChannelId = args[0];
            if (!streamingChannelId) {
                await this.mezonClientService.updateMessage(
                    repliedMessage,
                    getTextMessage('Please provide a streaming channel ID. Usage: `*dj setup <streaming_channel_id>`'),
                );
                return;
            }

            const userId = event.sender_id as string;
            const clanId = event.clan_id as string;
            const username = (event.username || event.display_name) as string;
            const avatar = event.avatar as string;

            await this.prismaService.$transaction(async (tx) => {
                await tx.user.upsert({
                    where: { id: userId },
                    update: { username, avatar },
                    create: { id: userId, username, avatar },
                });

                await tx.clan.upsert({
                    where: { id: clanId },
                    update: { ownerId: userId },
                    create: { id: clanId, ownerId: userId },
                });

                const oldChannel = await tx.streamingChannel.findFirst({
                    where: { clanId },
                });

                if (oldChannel && oldChannel.id !== streamingChannelId) {
                    const oldPlaylists = await tx.playlist.findMany({
                        where: { streamingChannelId: oldChannel.id },
                        select: { id: true },
                    });

                    for (const pl of oldPlaylists) {
                        await tx.playlistSong.deleteMany({
                            where: { playlistId: pl.id },
                        });
                    }

                    await tx.playlist.deleteMany({
                        where: { streamingChannelId: oldChannel.id },
                    });

                    await tx.streamingChannel.delete({
                        where: { id: oldChannel.id },
                    });
                }

                await tx.streamingChannel.upsert({
                    where: { id: streamingChannelId },
                    update: { clanId },
                    create: { id: streamingChannelId, clanId },
                });

                const existingPlaylist = await tx.playlist.findFirst({
                    where: { streamingChannelId },
                });

                if (!existingPlaylist) {
                    await tx.playlist.create({
                        data: {
                            id: `${streamingChannelId}-playlist`,
                            streamingChannelId,
                        },
                    });
                }
            });

            await this.mezonClientService.updateMessage(
                repliedMessage,
                getTextMessage('Setup completed successfully! User, clan, channel, and default playlist have been created.'),
            );
        } catch (error) {
            console.error('❌ Lỗi khi thực hiện lệnh `setup`:', error);
            await this.miscService.handleCommandError(ctx);
        }
    }
}
