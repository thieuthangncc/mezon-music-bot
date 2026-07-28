import { Injectable } from '@nestjs/common';
import { BotCommand, CommandContext, CommandRole } from '../command.interface';
import { MezonClientService } from '@/libs/mezon-client/mezon-client.service';
import { MiscService } from '@/modules/misc/misc.service';
import { VoicePlaylistService } from '@/modules/voice-playlist/voice-playlist.service';
import { SongResolverService } from '@/modules/song-cache/song-resolver.service';
import { getTextMessage, getSongEmbedMessage, getEmbedMessage, getRandomPastelHexColor, getYoutubeTrackInfo, extractFirstUrl } from '@/utils';

@Injectable()
export class RequestCommand implements BotCommand {
    name = 'req';
    role: CommandRole = 'public';
    description = 'Thêm bài hát vào playlist';

    constructor(
        private readonly mcService: MezonClientService,
        private readonly miscService: MiscService,
        private readonly voicePlaylistService: VoicePlaylistService,
        private readonly songResolverService: SongResolverService,
    ) {}

    async execute(ctx: CommandContext) {
        const { event, repliedMessage, args } = ctx;

        try {
            const songUrl = extractFirstUrl(event.content?.t as string) ?? args[0];

            if (!songUrl) {
                await this.mcService.updateMessage(
                    repliedMessage,
                    getTextMessage('Vui lòng cung cấp link bài hát. Ví dụ: `*dj add <link>`'),
                );
                return;
            }

            const clanId = event.clan_id as string;
            const requestedBy = (event.display_name || event.username || 'Unknown') as string;

            const trackInfo = await getYoutubeTrackInfo(songUrl);

            await this.mcService.updateMessage(
                repliedMessage,
                getEmbedMessage({
                    color: getRandomPastelHexColor(),
                    title: trackInfo?.trackName ?? '🎵 Đang thêm bài vào danh sách...',
                    description: '⏳ Đang thêm bài hát, vui lòng đợi...',
                    thumbnail: trackInfo?.thumbnailUrl ? { url: trackInfo.thumbnailUrl } : undefined,
                    author: trackInfo?.authorName
                        ? { name: trackInfo.authorName, url: trackInfo.authorUrl }
                        : undefined,
                }),
            );

            const resolved = await this.songResolverService.resolve(songUrl);

            const song = await this.voicePlaylistService.addSong(
                clanId,
                resolved.youtubeUrl,
                resolved.playableUrl,
                resolved.trackInfo,
                requestedBy,
            );
            const prevSong = await this.voicePlaylistService.getPreviousSongByClanId(clanId, song.order);

            await this.mcService.updateMessage(
                repliedMessage,
                getSongEmbedMessage({
                    trackInfo: resolved.trackInfo,
                    description: `✅ Đã thêm bài hát (#${song.order})`,
                    songUrl: resolved.youtubeUrl,
                    order: song.order,
                    prevTrackName: prevSong?.trackName ?? '—',
                    requestedBy,
                }),
            );
        } catch (error) {
            console.error('❌ Lỗi khi thực hiện lệnh `add`:', error);
            await this.miscService.handleCommandError(ctx, error);
        }
    }
}
