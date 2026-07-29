import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '@/libs/prisma/prisma.module';
import { SongCacheModule } from '@/modules/song-cache/song-cache.module';
import { VoicePlaybackService } from './voice-playback.service';
import { VoicePlaylistService } from './voice-playlist.service';

@Global()
@Module({
    imports: [PrismaModule, SongCacheModule],
    providers: [VoicePlaylistService, VoicePlaybackService],
    exports: [VoicePlaylistService, VoicePlaybackService],
})
export class VoicePlaylistModule {}
