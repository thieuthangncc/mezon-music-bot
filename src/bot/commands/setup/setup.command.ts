import { Injectable } from '@nestjs/common';
import { BotCommand, CommandContext, CommandRole } from '../command.interface';
import { MezonClientService } from '@/libs/mezon-client/mezon-client.service';
import { PrismaService } from '@/libs/prisma/prisma.service';
import { MiscService } from '@/modules/misc/misc.service';
import { getTextMessage } from '@/utils';

@Injectable()
export class SetupCommand implements BotCommand {
    name = 'setup';
    role: CommandRole = 'elevated';
    description = 'Khởi tạo clan và playlist';

    constructor(
        private readonly mezonClientService: MezonClientService,
        private readonly prismaService: PrismaService,
        private readonly miscService: MiscService,
    ) {}

    async execute(ctx: CommandContext) {
        const { event, repliedMessage } = ctx;

        try {
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
                    create: { id: clanId, ownerId: userId, moderatorIds: [] },
                });

                await tx.playlist.upsert({
                    where: { clanId },
                    update: {},
                    create: {
                        id: `${clanId}-playlist`,
                        clanId,
                    },
                });
            });

            await this.mezonClientService.updateMessage(
                repliedMessage,
                getTextMessage('Khởi tạo thành công! User, clan và playlist mặc định đã được tạo.'),
            );
        } catch (error) {
            console.error('❌ Lỗi khi thực hiện lệnh `setup`:', error);
            await this.miscService.handleCommandError(ctx);
        }
    }
}
