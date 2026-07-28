import { Injectable } from '@nestjs/common';
import { BotCommand, CommandContext } from '../command.interface';
import { MezonClientService } from '@/libs/mezon-client/mezon-client.service';
import { MiscService } from '@/modules/misc/misc.service';
import { VoicePlaybackService } from '@/modules/voice-playlist/voice-playback.service';
import { VoicePlaylistService } from '@/modules/voice-playlist/voice-playlist.service';
import { getTextMessage } from '@/utils';

@Injectable()
export class SkipCommand implements BotCommand {
    name = 'skip';
    isPublic = true;

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
            const session = this.voicePlaylistService.findSessionByClanId(clanId);

            if (!session) {
                await this.mcService.updateMessage(
                    repliedMessage,
                    getTextMessage('Bot is not playing yet. Use `*dj play <link>` first.'),
                );
                return;
            }

            const { removedSong, nextSong } = await this.voicePlaybackService.skipCurrentSong(
                session.voiceChannelId,
            );

            if (!removedSong) {
                await this.mcService.updateMessage(
                    repliedMessage,
                    getTextMessage('No current song to skip.'),
                );
                return;
            }

            if (!nextSong) {
                await this.mcService.updateMessage(
                    repliedMessage,
                    getTextMessage(`Skipped "${removedSong.trackName}". Playlist is now empty.`),
                );
                return;
            }

            await this.mcService.updateMessage(
                repliedMessage,
                getTextMessage(
                    `Skipped "${removedSong.trackName}". Now playing "${nextSong.trackName}".`,
                ),
            );
        } catch (error) {
            console.error('❌ Lỗi khi thực hiện lệnh `skip`:', error);
            await this.miscService.handleCommandError(ctx, error);
        }
    }
}
