import { Injectable } from '@nestjs/common';
import { BotCommand, CommandContext } from '../command.interface';
import { MiscService } from '@/modules/misc/misc.service';
import { StreamingService } from '@/modules/streaming/streaming.service';
import { MezonClientService } from '@/libs/mezon-client/mezon-client.service';
import { getTextMessage } from '@/utils';


@Injectable()
export class PlayCommand implements BotCommand {
    name = 'play';
    isPublic = true;

    constructor(
        private readonly mcService: MezonClientService,
        private readonly miscService: MiscService,
        private readonly streamingService: StreamingService,
    ) {}

    async execute(ctx: CommandContext) {
        const {repliedMessage} = ctx
        try {
            this.streamingService.playStreaming({
                ChannelId: "2079770751530962944",
                FileUrl: ctx.args[0],
            });
        } catch (error) {
            console.error('❌ Lỗi khi thực hiện lệnh `play`:', error);
            await this.miscService.handleCommandError(ctx);
        }
    }
}
