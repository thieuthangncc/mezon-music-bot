import { Module } from '@nestjs/common';
import { CommandService } from '../commands/command.service';
import { PingCommand } from './ping/ping.command';
import { PlayCommand } from './play/play.command';
import { StopCommand } from './stop/stop.command';
import { SetupCommand } from './setup/setup.command';

@Module({
    providers: [CommandService, PingCommand, PlayCommand, StopCommand, SetupCommand],
    exports: [CommandService],
})
export class CommandModule {}
