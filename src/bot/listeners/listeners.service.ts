import { Injectable } from '@nestjs/common';
import { MezonClientService } from '@libs/mezon-client/mezon-client.service';
import { isTrigger, parseCommand } from '@/utils';
import { CommandService } from '@/bot/commands/command.service';
import { ChannelMessageEvent } from '@/constants';

@Injectable()
export class ListenersService {
    private listenersBound = false;

    constructor(
        private readonly mezonClientService: MezonClientService,
        private readonly commandService: CommandService,
    ) {}

    async onModuleInit() {
        if (this.listenersBound) {
            return;
        }

        this.onMessage();
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
}
