import { Injectable } from '@nestjs/common';
import { BotCommand, CommandContext } from '../command.interface';
import { MezonClientService } from '@/libs/mezon-client/mezon-client.service';
import { MiscService } from '@/modules/misc/misc.service';
import { VoicePlaylistService } from '@/modules/voice-playlist/voice-playlist.service';
import { SongResolverService } from '@/modules/song-cache/song-resolver.service';
import { getTextMessage, getSongEmbedMessage, extractFirstUrl } from '@/utils';

@Injectable()
export class AddCommand implements BotCommand {
    name = 'add';
    isPublic = true;

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
                    getTextMessage('Please provide a song link. Usage: `*dj add <link>`'),
                );
                return;
            }

            const clanId = event.clan_id as string;
            const session = this.voicePlaylistService.findSessionByClanId(clanId);

            if (!session) {
                await this.mcService.updateMessage(
                    repliedMessage,
                    getTextMessage('Bot is not playing yet. Use `*dj play <link>` first.'),
                );
                return;
            }

            const requestedBy = (event.display_name || event.username || 'Unknown') as string;

            const resolved = await this.songResolverService.resolve(songUrl, {
                onFetching: async () => {
                    await this.mcService.updateMessage(
                        repliedMessage,
                        getTextMessage('Fetching song info from YouTube...'),
                    );
                },
                onDownloading: async (title) => {
                    await this.mcService.updateMessage(
                        repliedMessage,
                        getTextMessage(`Downloading "${title}"...`),
                    );
                },
                onConverting: async (title) => {
                    await this.mcService.updateMessage(
                        repliedMessage,
                        getTextMessage(`Converting "${title}" to OGG...`),
                    );
                },
                onUploading: async (title) => {
                    await this.mcService.updateMessage(
                        repliedMessage,
                        getTextMessage(`Uploading "${title}"...`),
                    );
                },
            });

            const song = this.voicePlaylistService.addSong(
                session.voiceChannelId,
                resolved.youtubeUrl,
                resolved.playableUrl,
                resolved.trackInfo,
                requestedBy,
            );
            const prevSong = this.voicePlaylistService.getPreviousSong(
                session.voiceChannelId,
                song.order,
            );

            const cacheLabel = resolved.fromCache ? ' (from cache)' : '';
            await this.mcService.updateMessage(
                repliedMessage,
                getSongEmbedMessage({
                    trackInfo: resolved.trackInfo,
                    description: `✅ Added to playlist (#${song.order})${cacheLabel}`,
                    songUrl: resolved.youtubeUrl,
                    order: song.order,
                    prevTrackName: prevSong?.trackName ?? '—',
                    requestedBy,
                }),
            );
        } catch (error) {
            console.error('❌ Error when executing command `add`:', error);
            await this.miscService.handleCommandError(ctx, error);
        }
    }
}
