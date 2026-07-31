import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppService } from './app.service';
import { MezonClientModule } from './libs/mezon-client/mezon-client.module';
import { PrismaModule } from './libs/prisma/prisma.module';
import { MiscModule } from './modules/misc/misc.module';
import { StreamingModule } from './modules/streaming/streaming.module';
import { ListenersModule } from './bot/listeners/listeners.module';
import { VoicePlaylistModule } from './modules/voice-playlist/voice-playlist.module';
import { SongCacheModule } from './modules/song-cache/song-cache.module';
import { AiModule } from './modules/ai/ai.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        MezonClientModule,
        PrismaModule,
        MiscModule,
        StreamingModule,
        VoicePlaylistModule,
        SongCacheModule,
        AiModule,
        ListenersModule,
    ],
    providers: [AppService],
})
export class AppModule {}
