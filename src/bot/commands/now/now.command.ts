import { Injectable } from '@nestjs/common';
import { BotCommand, CommandContext, CommandRole } from '../command.interface';
import { MezonClientService } from '@/libs/mezon-client/mezon-client.service';
import { MiscService } from '@/modules/misc/misc.service';
import { VoicePlaylistService } from '@/modules/voice-playlist/voice-playlist.service';
import { getTextMessage, getNowPlayingEmbedMessage } from '@/utils';

@Injectable()
export class NowCommand implements BotCommand {
    name = 'now';
    role: CommandRole = 'public';
    description = 'Xem bài hát đang phát';

    constructor(
        private readonly mcService: MezonClientService,
        private readonly miscService: MiscService,
        private readonly voicePlaylistService: VoicePlaylistService,
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

            const currentSong = await this.voicePlaylistService.getCurrentSong(session.voiceChannelId);

            if (!currentSong) {
                await this.mcService.updateMessage(
                    repliedMessage,
                    getTextMessage(`Không có bài hát nào đang phát trong "${session.channelName}".`),
                );
                return;
            }

            const nextSong = await this.voicePlaylistService.getNextSong(
                session.voiceChannelId,
                currentSong.order,
            );
            const progress = await this.voicePlaylistService.getPlaybackProgress(session.voiceChannelId);
            const trackInfo = this.voicePlaylistService.songToTrackInfo(currentSong);
            const queueTotal = await this.voicePlaylistService.getSongCount(clanId);

            await this.mcService.updateMessage(
                repliedMessage,
                getNowPlayingEmbedMessage({
                    currentSong,
                    trackInfo,
                    channelName: session.channelName,
                    progress,
                    nextTrackName: nextSong?.trackName,
                    queueTotal,
                }),
            );
        } catch (error) {
            console.error('❌ Lỗi khi thực hiện lệnh `now`:', error);
            await this.miscService.handleCommandError(ctx);
        }
    }
}
