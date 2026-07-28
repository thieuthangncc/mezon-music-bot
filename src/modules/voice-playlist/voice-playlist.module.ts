import { Global, Module } from '@nestjs/common';
import { VoicePlaybackService } from './voice-playback.service';
import { VoicePlaylistService } from './voice-playlist.service';

@Global()
@Module({
    providers: [VoicePlaylistService, VoicePlaybackService],
    exports: [VoicePlaylistService, VoicePlaybackService],
})
export class VoicePlaylistModule {}
