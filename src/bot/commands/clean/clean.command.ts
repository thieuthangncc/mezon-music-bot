import { Injectable } from '@nestjs/common';
import { BotCommand, CommandContext, CommandRole } from '../command.interface';
import { MezonClientService } from '@/libs/mezon-client/mezon-client.service';
import { MiscService } from '@/modules/misc/misc.service';
import { VoicePlaylistService } from '@/modules/voice-playlist/voice-playlist.service';
import { getInfoMessage, getSuccessMessage } from '@/utils';

@Injectable()
export class CleanCommand implements BotCommand {
    name = 'clean';
    role: CommandRole = 'elevated';
    description = 'Xóa các bài đã phát khỏi playlist';

    constructor(
        private readonly mcService: MezonClientService,
        private readonly miscService: MiscService,
        private readonly voicePlaylistService: VoicePlaylistService,
    ) {}

    async execute(ctx: CommandContext) {
        const { event, repliedMessage } = ctx;

        try {
            const clanId = event.clan_id as string;
            const removedCount = await this.voicePlaylistService.cleanPlayedSongs(clanId);

            if (removedCount === 0) {
                await this.mcService.updateMessage(
                    repliedMessage,
                    getInfoMessage('Không có bài nào đã phát để dọn', 'Playlist vẫn giữ nguyên nha.'),
                );
                return;
            }

            await this.mcService.updateMessage(
                repliedMessage,
                getSuccessMessage(
                    `Đã dọn ${removedCount} bài đã phát`,
                    'Các bài chưa phát vẫn còn trong hàng đợi.',
                ),
            );
        } catch (error) {
            console.error('❌ Lỗi khi thực hiện lệnh `clean`:', error);
            await this.miscService.handleCommandError(ctx, error);
        }
    }
}
