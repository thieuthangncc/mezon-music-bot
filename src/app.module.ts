import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppService } from './app.service';
import { MezonClientModule } from './libs/mezon-client/mezon-client.module';
import { PrismaModule } from './libs/prisma/prisma.module';
import { MiscModule } from './modules/misc/misc.module';
import { StreamingModule } from './modules/streaming/streaming.module';
import { ListenersModule } from './bot/listeners/listeners.module';
import { RoomModule } from './modules/room/room.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        MezonClientModule,
        PrismaModule,
        MiscModule,
        StreamingModule,
        ListenersModule,
        RoomModule,
    ],
    providers: [AppService],
})
export class AppModule {}
