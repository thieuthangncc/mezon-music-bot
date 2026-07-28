import { Injectable, OnModuleInit } from '@nestjs/common';
import { MezonClientService } from '@libs/mezon-client/mezon-client.service';
import { VoicePlaybackService } from '@/modules/voice-playlist/voice-playback.service';
import { VoicePlaylistService } from '@/modules/voice-playlist/voice-playlist.service';
import { isTrigger, parseCommand } from '@/utils';
import { CommandService } from '@/bot/commands/command.service';
import { ChannelMessageEvent } from '@/constants';

@Injectable()
export class ListenersService implements OnModuleInit {
    private listenersBound = false;

    constructor(
        private readonly mezonClientService: MezonClientService,
        private readonly commandService: CommandService,
        private readonly voicePlaylistService: VoicePlaylistService,
        private readonly voicePlaybackService: VoicePlaybackService,
    ) {}

    async onModuleInit() {
        if (this.listenersBound) {
            return;
        }

        this.onMessage();
        this.onVoiceLeaved();
        this.listenersBound = true;
    }

    async onMessage() {
        this.mezonClientService.getClient().onChannelMessage(async (event: ChannelMessageEvent) => {
            if (event.sender_id === this.mezonClientService.getClient().clientId) {
                return;
            }
            if (!event.channel_id || !event.message_id || !event.content?.t) {
                return;
            }

            if (isTrigger(event.content?.t as string)) {
                const { commandName, args } = parseCommand(event.content?.t as string);

                await this.commandService.handle(event, commandName, args);
            }
        });
    }

    onVoiceLeaved() {
        const botId = process.env.MEZON_BOT_ID as string;

        this.mezonClientService.getClient().onVoiceLeavedEvent(async (event) => {
            if (event.voice_user_id !== botId) {
                return;
            }

            // If we're already scheduled to advance to next track,
            // Mezon might emit voiceLeaved while switching. Keep session alive.
            if (this.voicePlaybackService.isAdvanceScheduled(event.voice_channel_id)) {
                return;
            }

            await this.voicePlaybackService.killSession(event.voice_channel_id);
        });
    }
}
