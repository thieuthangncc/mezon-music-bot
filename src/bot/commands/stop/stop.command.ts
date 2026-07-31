import { Injectable } from '@nestjs/common';
import { BotCommand, CommandContext, CommandRole } from '../command.interface';
import { SILENCE_URL } from '@/constants/misc.constant';
import { MezonClientService } from '@/libs/mezon-client/mezon-client.service';
import { MiscService } from '@/modules/misc/misc.service';
import { VoicePlaybackService } from '@/modules/voice-playlist/voice-playback.service';
import { VoicePlaylistService } from '@/modules/voice-playlist/voice-playlist.service';
import { getSuccessMessage } from '@/utils';

@Injectable()
export class StopCommand implements BotCommand {
    name = 'stop';
    role: CommandRole = 'elevated';
    description = 'Dừng phát nhạc';

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

            await this.mcService.updateMessage(
                repliedMessage,
                getSuccessMessage('Đã dừng phát nhạc', 'Dùng `*dj play` để tiếp tục phát nha.'),
            );
        } catch (error) {
            console.error('❌ Lỗi khi thực hiện lệnh `stop`:', error);
            await this.miscService.handleCommandError(ctx, error);
        }
    }
}
