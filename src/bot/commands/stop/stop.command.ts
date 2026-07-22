import { Injectable } from '@nestjs/common';
import { BotCommand, CommandContext } from '../command.interface';
import { MiscService } from '@/modules/misc/misc.service';
import { StreamingService } from '@/modules/streaming/streaming.service';
import { getTextMessage } from '@/utils';
import { MezonClientService } from '@/libs/mezon-client/mezon-client.service';


@Injectable()
export class StopCommand implements BotCommand {
    name = 'stop';
    isPublic = true;

    constructor(
        private readonly mcService: MezonClientService,
        private readonly miscService: MiscService,
        private readonly streamingService: StreamingService,
    ) {}

    async execute(ctx: CommandContext) {
        const {repliedMessage} = ctx;
        try {
            this.streamingService.stopStreaming({
                ChannelId: "2079770751530962944"
            });
            this.mcService.updateMessage(repliedMessage, getTextMessage("stopped"));
        } catch (error) {
            console.error('❌ Lỗi khi thực hiện lệnh `stop`:', error);
            await this.miscService.handleCommandError(ctx);
        }
    }}
