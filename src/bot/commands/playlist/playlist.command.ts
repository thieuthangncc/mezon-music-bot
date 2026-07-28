import { Injectable } from '@nestjs/common';
import { BotCommand, CommandContext } from '../command.interface';
import { MezonClientService } from '@/libs/mezon-client/mezon-client.service';
import { MiscService } from '@/modules/misc/misc.service';
import { VoicePlaylistService } from '@/modules/voice-playlist/voice-playlist.service';
import { getTextMessage } from '@/utils';

const PLAYLIST_LIMIT = 20;

@Injectable()
export class PlaylistCommand implements BotCommand {
    name = 'playlist';
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

            const songs = this.voicePlaylistService.getTopSongs(clanId, PLAYLIST_LIMIT);

            if (songs.length === 0) {
                await this.mcService.updateMessage(
                    repliedMessage,
                    getTextMessage(`Playlist in "${session.channelName}" is empty.`),
                );
                return;
            }

            const lines = songs.map((song) => `${song.order}. ${song.trackName}`);
            const total = session.songs.length;
            const header = total > PLAYLIST_LIMIT
                ? `🎵 Playlist in "${session.channelName}" (top ${PLAYLIST_LIMIT}/${total})`
                : `🎵 Playlist in "${session.channelName}" (${total} songs)`;

            await this.mcService.updateMessage(
                repliedMessage,
                getTextMessage(`${header}\n${lines.join('\n')}`),
            );
        } catch (error) {
            console.error('❌ Error when executing command `playlist`:', error);
            await this.miscService.handleCommandError(ctx);
        }
    }
}
