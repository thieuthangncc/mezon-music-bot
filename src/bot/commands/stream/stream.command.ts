import { Injectable } from '@nestjs/common';
import { BotCommand, CommandContext, CommandRole } from '../command.interface';
import { MiscService } from '@/modules/misc/misc.service';
import { StreamingService } from '@/modules/streaming/streaming.service';
import { MezonClientService } from '@/libs/mezon-client/mezon-client.service';

@Injectable()
export class StreamCommand implements BotCommand {
    name = 'stream';
    role: CommandRole = 'elevated';
    description = 'Stream media trực tiếp';

    constructor(
        private readonly mcService: MezonClientService,
        private readonly miscService: MiscService,
        private readonly streamingService: StreamingService,
    ) {}

    async execute(ctx: CommandContext) {
        try {
            this.streamingService.playStreaming({
                ChannelId: '2079770751530962944',
                FileUrl: ctx.args[0],
            });
        } catch (error) {
            console.error('❌ Lỗi khi thực hiện lệnh `stream`:', error);
            await this.miscService.handleCommandError(ctx);
        }
    }
}
