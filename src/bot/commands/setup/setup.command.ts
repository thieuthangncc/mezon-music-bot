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

            const userData = {
                id: event.sender_id as string,
                username: event.username as string,
                avatar: event.avatar as string,
                clanId: event.clan_id as string,
                streamingChannelId,
            };

            await this.prismaService.user.upsert({
                where: { id: userData.id },
                update: userData,
                create: userData,
            });

            await this.mezonClientService.updateMessage(
                repliedMessage,
                getTextMessage('Setup completed successfully! Your streaming channel ID has been saved.'),
            );
        } catch (error) {
            console.error('❌ Lỗi khi thực hiện lệnh `setup`:', error);
            await this.miscService.handleCommandError(ctx);
        }
    }
}
