import { Injectable } from '@nestjs/common';
import { BotCommand, CommandContext, CommandRole } from '../command.interface';
import { MezonClientService } from '@/libs/mezon-client/mezon-client.service';
import { MiscService } from '@/modules/misc/misc.service';
import { VoicePlaylistService } from '@/modules/voice-playlist/voice-playlist.service';
import { getEmbedMessage, getTextMessage, getRandomPastelHexColor } from '@/utils';

const PLAYLIST_LIMIT = 20;

@Injectable()
export class PlaylistCommand implements BotCommand {
    name = 'playlist';
    role: CommandRole = 'public';
    description = 'Xem danh sách bài hát';

    constructor(
        private readonly mcService: MezonClientService,
        private readonly miscService: MiscService,
        private readonly voicePlaylistService: VoicePlaylistService,
    ) {}

    async execute(ctx: CommandContext) {
        const { event, repliedMessage } = ctx;

        try {
            const clanId = event.clan_id as string;
            const songs = await this.voicePlaylistService.getSongsByClanId(clanId, PLAYLIST_LIMIT);
            const total = await this.voicePlaylistService.getSongCount(clanId);

            if (songs.length === 0) {
                await this.mcService.updateMessage(
                    repliedMessage,
                    getTextMessage('Playlist trống. Dùng `*dj add <link>` để thêm bài hát.'),
                );
                return;
            }

            const songLines = songs.map((song) => `🎶 **${song.order}.** ${song.trackName}`);

            await this.mcService.updateMessage(
                repliedMessage,
                getEmbedMessage({
                    color: getRandomPastelHexColor(),
                    title: '🎵 Danh sách phát',
                    description: `Tổng cộng **${total}** bài hát`,
                    fields: [
                        { name: '📜 Danh sách', value: songLines.join('\n'), inline: false },
                    ],
                    footer: {
                        text:
                            total > PLAYLIST_LIMIT
                                ? `📌 Chỉ hiển thị ${PLAYLIST_LIMIT}/${total} bài đầu tiên`
                                : '💡 Dùng *dj req <link> để thêm bài hát',
                    },
                }),
            );
        } catch (error) {
            console.error('❌ Lỗi khi thực hiện lệnh `playlist`:', error);
            await this.miscService.handleCommandError(ctx);
        }
    }
}
