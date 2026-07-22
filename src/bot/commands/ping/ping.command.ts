import { Injectable } from '@nestjs/common';
import { BotCommand, CommandContext } from '../command.interface';
import { MezonClientService } from '@/libs/mezon-client/mezon-client.service';
import { MiscService } from '@/modules/misc/misc.service';
import { getTextMessage } from '@/utils';


@Injectable()
export class PingCommand implements BotCommand {
    name = 'ping';
    isPublic = true;

    constructor(
        private readonly mezonClientService: MezonClientService,
        private readonly miscService: MiscService,
    ) {}

    async execute(ctx: CommandContext) {
        const { event, repliedMessage } = ctx;
        const msg = event.display_name + " just ping";
        try {
            await this.mezonClientService.updateMessage(repliedMessage, getTextMessage(msg));
        } catch (error) {
            console.error('❌ Lỗi khi thực hiện lệnh `kbb`:', error);
            await this.miscService.handleCommandError(ctx);
        }
    }
}
