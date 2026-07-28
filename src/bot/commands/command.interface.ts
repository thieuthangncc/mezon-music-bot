import { ChannelMessageEvent } from '@/constants';
import { Message } from 'mezon-sdk/dist/cjs/mezon-client/structures/Message';

export type CommandRole = 'public' | 'elevated';

export interface BotCommand {
    name: string;
    role: CommandRole;
    description: string;
    execute(ctx: CommandContext): Promise<void>;
}

export interface CommandContext {
    event: ChannelMessageEvent;
    repliedMessage: Message;
    args: string[];
}
