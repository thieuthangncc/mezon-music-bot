import { Global, Module } from '@nestjs/common';
import { MezonClientService } from './mezon-client.service';

@Global()
@Module({
    providers: [MezonClientService],
    exports: [MezonClientService],
})
export class MezonClientModule {}
