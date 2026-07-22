import { Module } from '@nestjs/common';
import { CommandService } from '../commands/command.service';
import { PingCommand } from './ping/ping.command';
import { PlayCommand } from './play/play.command';
import { StopCommand } from './stop/stop.command';

@Module({
    providers: [CommandService, PingCommand, PlayCommand, StopCommand],
    exports: [CommandService],
})
export class CommandModule {}
