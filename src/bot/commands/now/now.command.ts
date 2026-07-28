import { Injectable } from '@nestjs/common';
import { BotCommand, CommandContext } from '../command.interface';
import { MezonClientService } from '@/libs/mezon-client/mezon-client.service';
import { MiscService } from '@/modules/misc/misc.service';
import { VoicePlaylistService } from '@/modules/voice-playlist/voice-playlist.service';
import { getTextMessage, getNowPlayingEmbedMessage } from '@/utils';

@Injectable()
export class NowCommand implements BotCommand {
    name = 'now';
    isPublic = true;

    constructor(
        private readonly mcService: MezonClientService,
        private readonly miscService: MiscService,
        private readonly voicePlaylistService: VoicePlaylistService,
    ) {}

    async execute(ctx: CommandContext) {
        const { event, repliedMessage } = ctx;

        try {
            const clanId = event.clan_id as string;
            const session = this.voicePlaylistService.findSessionByClanId(clanId);

            if (!session) {
                await this.mcService.updateMessage(
                    repliedMessage,
                    getTextMessage('Bot is not playing yet. Use `*dj playvc <link>` first.'),
                );
                return;
            }

            const currentSong = this.voicePlaylistService.getCurrentSong(session.voiceChannelId);

            if (!currentSong) {
                await this.mcService.updateMessage(
                    repliedMessage,
                    getTextMessage(`No song is playing in "${session.channelName}".`),
                );
                return;
            }

            const nextSong = this.voicePlaylistService.getNextSong(
                session.voiceChannelId,
                currentSong.order,
            );
            const progress = this.voicePlaylistService.getPlaybackProgress(session.voiceChannelId);
            const trackInfo = this.voicePlaylistService.songToTrackInfo(currentSong);

            await this.mcService.updateMessage(
                repliedMessage,
                getNowPlayingEmbedMessage({
                    currentSong,
                    trackInfo,
                    channelName: session.channelName,
                    progress,
                    nextTrackName: nextSong?.trackName,
                    queueTotal: session.songs.length,
                }),
            );
        } catch (error) {
            console.error('❌ Error when executing command `now`:', error);
            await this.miscService.handleCommandError(ctx);
        }
    }
}
