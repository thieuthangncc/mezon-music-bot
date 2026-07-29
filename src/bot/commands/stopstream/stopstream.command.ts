import { Injectable } from '@nestjs/common';
import { BotCommand, CommandContext, CommandRole } from '../command.interface';
import { MiscService } from '@/modules/misc/misc.service';
import { StreamingService } from '@/modules/streaming/streaming.service';
import { VoicePlaybackService } from '@/modules/voice-playlist/voice-playback.service';
import { VoicePlaylistService } from '@/modules/voice-playlist/voice-playlist.service';
import { getSuccessMessage } from '@/utils';
import { MezonClientService } from '@/libs/mezon-client/mezon-client.service';

@Injectable()
export class StopstreamCommand implements BotCommand {
    name = 'stopstream';
    role: CommandRole = 'elevated';
    description = 'Dừng stream trực tiếp';

    constructor(
        private readonly mcService: MezonClientService,
        private readonly miscService: MiscService,
        private readonly streamingService: StreamingService,
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

            this.streamingService.stopStreaming({
                ChannelId: session?.voiceChannelId ?? '2079770751530962944',
            });

            await this.mcService.updateMessage(
                repliedMessage,
                getSuccessMessage('Đã dừng stream', 'Dùng `*dj play` để phát nhạc nha.'),
            );
        } catch (error) {
            console.error('❌ Lỗi khi thực hiện lệnh `stopstream`:', error);
            await this.miscService.handleCommandError(ctx);
        }
    }
}
