import { ChannelMessageEvent } from '@/constants';
import { Message } from 'mezon-sdk/dist/cjs/mezon-client/structures/Message';

export interface BotCommand {
    name: string;
    isPublic: boolean;
    execute(ctx: CommandContext): Promise<void>;
}

export interface CommandContext {
    event: ChannelMessageEvent;
    repliedMessage: Message;
    args: string[];
}
