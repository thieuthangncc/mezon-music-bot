import { Injectable } from '@nestjs/common';
import { MezonClientService } from '@libs/mezon-client/mezon-client.service';
import { getInteralErrorMessage, getLoadingMessage } from '@/utils';
import { CommandContext } from '@/bot/commands/command.interface';

@Injectable()
export class MiscService {
    constructor(private readonly mezonClientService: MezonClientService) {}

    async sendLoadingMessage(channelId: string, messageId: string) {
        return await this.mezonClientService.replyMessage(channelId, messageId, getLoadingMessage());
    }

    async handleCommandError(ctx: CommandContext) {
        if (ctx.repliedMessage) {
            await this.mezonClientService.updateMessage(ctx.repliedMessage, getInteralErrorMessage());
        } else {
            await this.mezonClientService.replyMessage(
                ctx.event.channel_id as string,
                ctx.event.message_id as string,
                getInteralErrorMessage(),
            );
        }
    }
}
