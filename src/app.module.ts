import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppService } from './app.service';
import { MezonClientModule } from './libs/mezon-client/mezon-client.module';
import { MiscModule } from './modules/misc/misc.module';
import { ListenersModule } from './bot/listeners/listeners.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        MezonClientModule,
        MiscModule,
        ListenersModule,
    ],
    providers: [AppService],
})
export class AppModule {}
