import { Module } from '@nestjs/common';
import { ListenersService } from './listeners.service';
import { CommandModule } from '../commands/command.module';

@Module({
    imports: [CommandModule],
    providers: [ListenersService],
    exports: [ListenersService],
})
export class ListenersModule {}
