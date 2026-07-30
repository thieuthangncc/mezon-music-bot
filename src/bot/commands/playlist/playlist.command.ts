import { Injectable } from '@nestjs/common';
import { BotCommand, CommandContext, CommandRole } from '../command.interface';
import { MezonClientService } from '@/libs/mezon-client/mezon-client.service';
import { MiscService } from '@/modules/misc/misc.service';
import { VoicePlaylistService } from '@/modules/voice-playlist/voice-playlist.service';
import { getEmptyPlaylistMessage, getQueueEmbedMessage } from '@/utils';

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
            const unplayedTotal = await this.voicePlaylistService.getUnplayedSongCount(clanId);

            if (songs.length === 0) {
                await this.mcService.updateMessage(repliedMessage, getEmptyPlaylistMessage());
                return;
            }

            await this.mcService.updateMessage(
                repliedMessage,
                getQueueEmbedMessage({
                    songs,
                    total,
                    unplayedTotal,
                    limit: PLAYLIST_LIMIT,
                }),
            );
        } catch (error) {
            console.error('❌ Lỗi khi thực hiện lệnh `playlist`:', error);
            await this.miscService.handleCommandError(ctx);
        }
    }
}
