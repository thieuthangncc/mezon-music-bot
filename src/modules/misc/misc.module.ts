import { Global, Module } from '@nestjs/common';
import { MiscService } from './misc.service';

@Global()
@Module({
    providers: [MiscService],
    exports: [MiscService],
})
export class MiscModule {}
