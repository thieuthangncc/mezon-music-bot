import { Injectable } from '@nestjs/common';
import { BotCommand, CommandContext, CommandRole } from '../command.interface';
import { SILENCE_URL } from '@/constants/misc.constant';
import { MezonClientService } from '@/libs/mezon-client/mezon-client.service';
import { MiscService } from '@/modules/misc/misc.service';
import { VoicePlaybackService } from '@/modules/voice-playlist/voice-playback.service';
import { VoicePlaylistService } from '@/modules/voice-playlist/voice-playlist.service';
import { getInfoMessage, getSuccessMessage } from '@/utils';

@Injectable()
export class ClearCommand implements BotCommand {
    name = 'clear';
    role: CommandRole = 'elevated';
    description = 'Xóa toàn bộ playlist';

    constructor(
        private readonly mcService: MezonClientService,
        private readonly miscService: MiscService,
        private readonly voicePlaylistService: VoicePlaylistService,
        private readonly voicePlaybackService: VoicePlaybackService,
    ) {}

    async execute(ctx: CommandContext) {
        const { event, repliedMessage } = ctx;

        try {
            const clanId = event.clan_id as string;
            const session = await this.voicePlaylistService.findSessionByClanId(clanId);

            if (session) {
                const botId = process.env.MEZON_BOT_ID as string;
                const botName = process.env.MEZON_BOT_NAME as string;

                await this.mcService.playMediaViaApi({
                    clanId,
                    voiceChannelId: session.voiceChannelId,
                    url: SILENCE_URL,
                    participantIdentity: botId,
                    participantName: botName,
                    trackName: 'Silence',
                });

                await this.voicePlaybackService.killSession(session.voiceChannelId);
                this.mcService.leaveVoiceChannel(clanId, session.voiceChannelId);
            }

            const removedCount = await this.voicePlaylistService.clearAllSongs(clanId);

            if (removedCount === 0) {
                await this.mcService.updateMessage(
                    repliedMessage,
                    getInfoMessage('Playlist đang trống', 'Không có bài nào để xóa nha.'),
                );
                return;
            }

            await this.mcService.updateMessage(
                repliedMessage,
                getSuccessMessage(
                    `Đã xóa toàn bộ ${removedCount} bài khỏi playlist`,
                    'Dùng `*dj req <link>` để thêm bài mới nha.',
                ),
            );
        } catch (error) {
            console.error('❌ Lỗi khi thực hiện lệnh `clear`:', error);
            await this.miscService.handleCommandError(ctx, error);
        }
    }
}
