import { Injectable } from '@nestjs/common';
import { BotCommand } from './command.interface';
import { ChannelMessageEvent } from '@/constants';
import { Message } from 'mezon-sdk/dist/cjs/mezon-client/structures/Message';
import { MiscService } from '@/modules/misc/misc.service';
import { MezonClientService } from '@libs/mezon-client/mezon-client.service';
import { PingCommand } from './ping/ping.command';
import { PlayCommand } from './play/play.command';
import { StopCommand } from './stop/stop.command';

@Injectable()
export class CommandService {
    private commands = new Map<string, BotCommand>();

    constructor(
        private readonly miscService: MiscService,
        private readonly mcService: MezonClientService,
        private readonly pingCmd: PingCommand,
        private readonly playCmd: PlayCommand,
        private readonly stopCmd: StopCommand,
    ) {
        this.register(this.pingCmd);
        this.register(this.playCmd);
        this.register(this.stopCmd);
    }

    register(command: BotCommand) {
        this.commands.set(command.name, command);
    }

    async handle(event: ChannelMessageEvent, commandName: string, args: string[]) {
        let repliedMessage: Message;

        try {
            if (!event.channel_id || !event.message_id) {
                return;
            }
            const channelId: string = event.channel_id;
            const messageId: string = event.message_id;
            const normalizedCommand = (commandName || '').trim();

            if (!normalizedCommand) {
                await this.mcService.replyMessage(channelId, messageId, {
                    t: 'Bạn chưa nhập lệnh. Ví dụ: *mz ping',
                });
                return;
            }

            const message = await this.miscService.sendLoadingMessage(
                channelId,
                messageId,
            );
            if (!message?.message_id) {
                await this.mcService.sendChannelMessage(channelId, {
                    t: 'Không thể phản hồi vào tin nhắn này, vui lòng thử lại.',
                });
                return;
            }
            const channel = await this.mcService.getClient().channels.fetch(channelId);

            repliedMessage = await channel.messages.fetch(message?.message_id as string);

            const command = this.commands.get(normalizedCommand);

            if (!command) {
                await this.mcService.updateMessage(repliedMessage, {
                    t: '❓ Lệnh không tồn tại! Vui lòng thử lại!',
                });
                return;
            }
            await command.execute({ event, repliedMessage, args });
        } catch (error) {
            console.error('❌ Lỗi khi thực hiện lệnh `', commandName, '` | root:', error);
            this.miscService.handleCommandError({ event, repliedMessage: repliedMessage!, args });
        }
    }
}
