import { Global, Module } from '@nestjs/common';
import { AudioProcessingService } from './audio-processing.service';
import { CloudinaryStorageService } from './cloudinary-storage.service';
import { SongCacheService } from './song-cache.service';
import { SongResolverService } from './song-resolver.service';

@Global()
@Module({
    providers: [SongCacheService, AudioProcessingService, CloudinaryStorageService, SongResolverService],
    exports: [SongCacheService, AudioProcessingService, CloudinaryStorageService, SongResolverService],
})
export class SongCacheModule {}
