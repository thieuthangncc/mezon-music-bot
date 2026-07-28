import { Module } from '@nestjs/common';
import { CommandService } from '../commands/command.service';
import { PingCommand } from './ping/ping.command';
import { StreamCommand } from './stream/stream.command';
import { StopstreamCommand } from './stopstream/stopstream.command';
import { SetupCommand } from './setup/setup.command';
import { RequestCommand } from './request/request.command';
import { PlayCommand } from './play/play.command';
import { AddCommand } from './add/add.command';
import { PlaylistCommand } from './playlist/playlist.command';
import { NowCommand } from './now/now.command';
import { SkipCommand } from './skip/skip.command';
import { StopCommand } from './stop/stop.command';

@Module({
    providers: [CommandService, PingCommand, StreamCommand, StopstreamCommand, SetupCommand, RequestCommand, PlayCommand, AddCommand, PlaylistCommand, NowCommand, SkipCommand, StopCommand],
    exports: [CommandService],
})
export class CommandModule {}
