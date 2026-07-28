import { Injectable } from '@nestjs/common';
import { BotCommand, CommandContext, CommandRole } from '../command.interface';
import { MezonClientService } from '@/libs/mezon-client/mezon-client.service';
import { MiscService } from '@/modules/misc/misc.service';
import { VoicePlaybackService } from '@/modules/voice-playlist/voice-playback.service';
import { VoicePlaylistService } from '@/modules/voice-playlist/voice-playlist.service';
import { getTextMessage, getSongEmbedMessage, getUserVoiceChannel } from '@/utils';

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

            const songs = await this.voicePlaylistService.getPlaylistSongs(clanId);

            if (songs.length === 0) {
                await this.mcService.updateMessage(
                    repliedMessage,
                    getTextMessage('Playlist trống. Dùng `*dj add <link>` để thêm bài hát.'),
                );
                return;
            }

            const firstSong = songs[0];

            await this.voicePlaybackService.startSession(
                voiceChannel.channelId,
                clanId,
                voiceChannel.channelName,
            );
            await this.voicePlaybackService.playSong(voiceChannel.channelId, firstSong.order);

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
