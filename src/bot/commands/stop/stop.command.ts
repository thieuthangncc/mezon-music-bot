import { Injectable } from '@nestjs/common';
import { BotCommand, CommandContext, CommandRole } from '../command.interface';
import { MezonClientService } from '@/libs/mezon-client/mezon-client.service';
import { MiscService } from '@/modules/misc/misc.service';
import { VoicePlaybackService } from '@/modules/voice-playlist/voice-playback.service';
import { VoicePlaylistService } from '@/modules/voice-playlist/voice-playlist.service';
import { getTextMessage } from '@/utils';

@Injectable()
export class StopCommand implements BotCommand {
    name = 'stop';
    role: CommandRole = 'elevated';
    description = 'Dừng và xóa toàn bộ playlist';

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
                await this.voicePlaybackService.killSession(session.voiceChannelId);
                this.mcService.leaveVoiceChannel(clanId, session.voiceChannelId);
            }

            await this.voicePlaylistService.clearPlaylist(clanId);

            await this.mcService.updateMessage(
                repliedMessage,
                getTextMessage('Đã dừng và xóa toàn bộ playlist.'),
            );
        } catch (error) {
            console.error('❌ Lỗi khi thực hiện lệnh `stop`:', error);
            await this.miscService.handleCommandError(ctx, error);
        }
    }
}
