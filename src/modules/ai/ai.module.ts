import { Global, Module } from '@nestjs/common';
import { AiContentService } from './ai-content.service';

@Global()
@Module({
    providers: [AiContentService],
    exports: [AiContentService],
})
export class AiModule {}
