import { Injectable } from '@nestjs/common';
import { BotCommand, CommandContext, CommandRole } from '../command.interface';
import { MezonClientService } from '@/libs/mezon-client/mezon-client.service';
import { MiscService } from '@/modules/misc/misc.service';
import { VoicePlaybackService } from '@/modules/voice-playlist/voice-playback.service';
import { VoicePlaylistService } from '@/modules/voice-playlist/voice-playlist.service';
import { getTextMessage } from '@/utils';

@Injectable()
export class SkipCommand implements BotCommand {
    name = 'skip';
    role: CommandRole = 'elevated';
    description = 'Bỏ qua bài hát hiện tại';

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

            if (!session) {
                await this.mcService.updateMessage(
                    repliedMessage,
                    getTextMessage('Bot chưa phát nhạc. Dùng `*dj play` để phát.'),
                );
                return;
            }

            const { removedSong, nextSong } = await this.voicePlaybackService.skipCurrentSong(
                session.voiceChannelId,
            );

            if (!removedSong) {
                await this.mcService.updateMessage(
                    repliedMessage,
                    getTextMessage('Không có bài hát nào để bỏ qua.'),
                );
                return;
            }

            if (!nextSong) {
                await this.mcService.updateMessage(
                    repliedMessage,
                    getTextMessage(`Đã bỏ qua "${removedSong.trackName}". Playlist hiện đang trống.`),
                );
                return;
            }

            await this.mcService.updateMessage(
                repliedMessage,
                getTextMessage(
                    `Đã bỏ qua "${removedSong.trackName}". Đang phát "${nextSong.trackName}".`,
                ),
            );
        } catch (error) {
            console.error('❌ Lỗi khi thực hiện lệnh `skip`:', error);
            await this.miscService.handleCommandError(ctx, error);
        }
    }
}
