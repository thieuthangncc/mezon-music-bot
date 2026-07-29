import { Injectable } from '@nestjs/common';
import { BotCommand, CommandContext, CommandRole } from '../command.interface';
import { MezonClientService } from '@/libs/mezon-client/mezon-client.service';
import { MiscService } from '@/modules/misc/misc.service';
import { VoicePlaybackService } from '@/modules/voice-playlist/voice-playback.service';
import { VoicePlaylistService } from '@/modules/voice-playlist/voice-playlist.service';
import { getTextMessage, getSongEmbedMessage, getNowPlayingEmbedMessage, getUserVoiceChannel } from '@/utils';

@Injectable()
export class PlayCommand implements BotCommand {
    name = 'play';
    role: CommandRole = 'elevated';
    description = 'Phát playlist từ DB';

    constructor(
        private readonly mcService: MezonClientService,
        private readonly miscService: MiscService,
        private readonly voicePlaylistService: VoicePlaylistService,
        private readonly voicePlaybackService: VoicePlaybackService,
    ) {}

    async execute(ctx: CommandContext) {
        const { event, repliedMessage } = ctx;

        try {
            const userId = event.sender_id as string;
            const clanId = event.clan_id as string;
            const client = this.mcService.getClient();

            const voiceChannel = await getUserVoiceChannel(client, clanId, userId);

            if (!voiceChannel) {
                await this.mcService.updateMessage(
                    repliedMessage,
                    getTextMessage('Bạn cần tham gia kênh thoại trước khi sử dụng lệnh này.'),
                );
                return;
            }

            const songs = await this.voicePlaylistService.getSongsByClanId(clanId);

            if (songs.length === 0) {
                await this.mcService.updateMessage(
                    repliedMessage,
                    getTextMessage('Playlist trống. Dùng `*dj req <link>` để thêm bài hát.'),
                );
                return;
            }

            if (await this.voicePlaylistService.isPlaying(clanId)) {
                const session = await this.voicePlaylistService.findSessionByClanId(clanId);
                const currentSong = session
                    ? await this.voicePlaylistService.getCurrentSong(session.voiceChannelId)
                    : undefined;

                if (currentSong && session) {
                    const nextSong = await this.voicePlaylistService.getNextSong(
                        session.voiceChannelId,
                        currentSong.order,
                    );
                    const queueTotal = await this.voicePlaylistService.getSongCount(clanId);

                    await this.mcService.updateMessage(
                        repliedMessage,
                        getNowPlayingEmbedMessage({
                            currentSong,
                            trackInfo: this.voicePlaylistService.songToTrackInfo(currentSong),
                            channelName: session.channelName,
                            nextTrackName: nextSong?.trackName,
                            queueTotal,
                        }),
                    );
                    return;
                }

                await this.mcService.updateMessage(
                    repliedMessage,
                    getTextMessage('Bot đang phát nhạc. Dùng `*dj now` để xem bài hiện tại.'),
                );
                return;
            }

            const firstSong = songs[0];

            try {
                await this.voicePlaybackService.startPlayback(
                    clanId,
                    voiceChannel.channelId,
                    voiceChannel.channelName,
                    firstSong.order,
                );
            } catch (error) {
                console.error('❌ Lỗi khi phát nhạc:', error);
                await this.mcService.updateMessage(
                    repliedMessage,
                    getTextMessage('❌ Không thể phát nhạc. Vui lòng thử lại sau.'),
                );
                return;
            }

            await this.mcService.updateMessage(
                repliedMessage,
                getSongEmbedMessage({
                    trackInfo: this.voicePlaylistService.songToTrackInfo(firstSong),
                    description: `🎵 Đang phát trong "${voiceChannel.channelName}"`,
                    songUrl: firstSong.songUrl,
                    order: firstSong.order,
                    requestedBy: firstSong.requestedBy,
                }),
            );
        } catch (error) {
            console.error('❌ Lỗi khi thực hiện lệnh `play`:', error);
            await this.miscService.handleCommandError(ctx, error);
        }
    }
}
