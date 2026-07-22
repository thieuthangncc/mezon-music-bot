import { Module } from '@nestjs/common';
import { CommandService } from '../commands/command.service';
import { PingCommand } from './ping/ping.command';

@Module({
    providers: [CommandService, PingCommand],
    exports: [CommandService],
})
export class CommandModule {}
