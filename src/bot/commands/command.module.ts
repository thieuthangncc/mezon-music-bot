import { Module } from '@nestjs/common';
import { CommandService } from '../commands/command.service';
import { StreamCommand } from './stream/stream.command';
import { StopstreamCommand } from './stopstream/stopstream.command';
import { SetupCommand } from './setup/setup.command';
import { PlayCommand } from './play/play.command';
import { RequestCommand } from './request/request.command';
import { PlaylistCommand } from './playlist/playlist.command';
import { NowCommand } from './now/now.command';
import { SkipCommand } from './skip/skip.command';
import { StopCommand } from './stop/stop.command';
import { CleanCommand } from './clean/clean.command';
import { HelpCommand } from './help/help.command';
import { GrantPermissionCommand } from './grant-permission/grant-permission.command';

@Module({
    providers: [CommandService, StreamCommand, StopstreamCommand, SetupCommand, PlayCommand, RequestCommand, PlaylistCommand, NowCommand, SkipCommand, StopCommand, CleanCommand, HelpCommand, GrantPermissionCommand],
    exports: [CommandService],
})
export class CommandModule {}
