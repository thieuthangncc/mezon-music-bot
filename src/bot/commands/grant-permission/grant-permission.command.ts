import { Injectable } from '@nestjs/common';
import { BotCommand, CommandContext, CommandRole } from '../command.interface';
import { MezonClientService } from '@/libs/mezon-client/mezon-client.service';
import { PrismaService } from '@/libs/prisma/prisma.service';
import { MiscService } from '@/modules/misc/misc.service';
import { getTextMessage } from '@/utils';

@Injectable()
export class GrantPermissionCommand implements BotCommand {
    name = 'gp';
    role: CommandRole = 'elevated';
    description = 'Cấp quyền cho người dùng';

    constructor(
        private readonly mezonClientService: MezonClientService,
        private readonly prismaService: PrismaService,
        private readonly miscService: MiscService,
    ) {}

    async execute(ctx: CommandContext) {
        const { event, repliedMessage, args } = ctx;

        try {
            const clanId = event.clan_id as string;
            const senderId = event.sender_id as string;

            const rawIds = args.join(' ');
            if (!rawIds.trim()) {
                await this.mezonClientService.updateMessage(
                    repliedMessage,
                    getTextMessage('Vui lòng nhập ID người dùng. Ví dụ: *dj gp abc, xyz, mmm'),
                );
                return;
            }

            const newIds = rawIds
                .split(',')
                .map((id) => id.trim())
                .filter((id) => id.length > 0);

            if (newIds.length === 0) {
                await this.mezonClientService.updateMessage(
                    repliedMessage,
                    getTextMessage('Không tìm thấy ID hợp lệ.'),
                );
                return;
            }

            const clan = await this.prismaService.clan.findUnique({
                where: { id: clanId },
            });

            if (!clan) {
                await this.mezonClientService.updateMessage(
                    repliedMessage,
                    getTextMessage('Clan chưa được thiết lập. Vui lòng thiết lập clan trước.'),
                );
                return;
            }

            if (clan.ownerId !== senderId) {
                await this.mezonClientService.updateMessage(
                    repliedMessage,
                    getTextMessage('Bạn không có quyền cấp quyền. Chỉ chủ sở hữu clan mới có thể cấp quyền.'),
                );
                return;
            }

            const existingSet = new Set(clan.moderatorIds);
            let addedCount = 0;
            for (const id of newIds) {
                if (!existingSet.has(id)) {
                    existingSet.add(id);
                    addedCount++;
                }
            }

            if (addedCount === 0) {
                await this.mezonClientService.updateMessage(
                    repliedMessage,
                    getTextMessage('Không có ID người dùng mới nào được thêm. Tất cả ID đã có quyền.'),
                );
                return;
            }

            await this.prismaService.clan.update({
                where: { id: clanId },
                data: { moderatorIds: Array.from(existingSet) },
            });

            await this.mezonClientService.updateMessage(
                repliedMessage,
                getTextMessage(`Đã cấp quyền thành công cho ${addedCount} người dùng.`),
            );
        } catch (error) {
            console.error('❌ Lỗi khi thực hiện lệnh `grantpermission`:', error);
            await this.miscService.handleCommandError(ctx);
        }
    }
}
