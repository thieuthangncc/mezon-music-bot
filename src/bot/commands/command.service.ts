import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { getErrorMessage } from '@/utils';
import { BotCommand } from './command.interface';
import { ChannelMessageEvent } from '@/constants';
import { Message } from 'mezon-sdk/dist/cjs/mezon-client/structures/Message';
import { MiscService } from '@/modules/misc/misc.service';
import { MezonClientService } from '@libs/mezon-client/mezon-client.service';
import { PrismaService } from '@/libs/prisma/prisma.service';
import { StreamCommand } from './stream/stream.command';
import { StopstreamCommand } from './stopstream/stopstream.command';
import { SetupCommand } from './setup/setup.command';
import { PlayCommand } from './play/play.command';
import { RequestCommand } from './request/request.command';
import { PlaylistCommand } from './playlist/playlist.command';
import { NowCommand } from './now/now.command';
import { SkipCommand } from './skip/skip.command';
import { StopCommand } from './stop/stop.command';
import { CleanCommand } from './clean/clean.command';
import { HelpCommand } from './help/help.command';
import { GrantPermissionCommand } from './grant-permission/grant-permission.command';

@Injectable()
export class CommandService {
    private commands = new Map<string, BotCommand>();

    constructor(
        private readonly miscService: MiscService,
        private readonly mcService: MezonClientService,
        private readonly prismaService: PrismaService,
        private readonly streamCmd: StreamCommand,
        private readonly stopstreamCmd: StopstreamCommand,
        private readonly setupCmd: SetupCommand,
        private readonly playCmd: PlayCommand,
        private readonly requestCmd: RequestCommand,
        private readonly playlistCmd: PlaylistCommand,
        private readonly nowCmd: NowCommand,
        private readonly skipCmd: SkipCommand,
        private readonly stopCmd: StopCommand,
        private readonly cleanCmd: CleanCommand,
        @Inject(forwardRef(() => HelpCommand))
        private readonly helpCmd: HelpCommand,
        private readonly grantPermissionCmd: GrantPermissionCommand,
    ) {
        this.register(this.streamCmd);
        this.register(this.stopstreamCmd);
        this.register(this.setupCmd);
        this.register(this.playCmd);
        this.register(this.requestCmd);
        this.register(this.playlistCmd);
        this.register(this.nowCmd);
        this.register(this.skipCmd);
        this.register(this.stopCmd);
        this.register(this.cleanCmd);
        this.register(this.helpCmd);
        this.register(this.grantPermissionCmd);
    }

    register(command: BotCommand) {
        this.commands.set(command.name, command);
    }

    getCommands(): BotCommand[] {
        return Array.from(this.commands.values());
    }

    async handle(event: ChannelMessageEvent, commandName: string, args: string[]) {
        let repliedMessage: Message;

        try {
            if (!event.channel_id || !event.message_id) {
                return;
            }
            const channelId: string = event.channel_id;
            const messageId: string = event.message_id;
            const normalizedCommand = (commandName || '').trim();

            if (!normalizedCommand) {
                await this.mcService.replyMessage(
                    channelId,
                    messageId,
                    getErrorMessage('Bạn chưa nhập lệnh', 'Ví dụ: `*dj help`'),
                );
                return;
            }

            const message = await this.miscService.sendLoadingMessage(
                channelId,
                messageId,
            );
            if (!message?.message_id) {
                await this.mcService.sendChannelMessage(
                    channelId,
                    getErrorMessage(
                        'Không thể phản hồi tin nhắn này',
                        'Hãy thử gửi lại lệnh nha.',
                    ),
                );
                return;
            }
            const channel = await this.mcService.getClient().channels.fetch(channelId);

            repliedMessage = await channel.messages.fetch(message?.message_id as string);

            const command = this.commands.get(normalizedCommand);

            if (!command) {
                await this.mcService.updateMessage(
                    repliedMessage,
                    getErrorMessage('Lệnh không tồn tại', 'Dùng `*dj help` để xem danh sách lệnh nha.'),
                );
                return;
            }

            if (command.role === 'elevated') {
                const clanId = event.clan_id as string;
                const senderId = event.sender_id as string;

                const clan = await this.prismaService.clan.findUnique({
                    where: { id: clanId },
                });

                if (!clan) {
                    await this.mcService.updateMessage(
                        repliedMessage,
                        getErrorMessage(
                            'Clan chưa được thiết lập',
                            'Liên hệ chủ sở hữu hoặc dùng `*dj setup` nha.',
                        ),
                    );
                    return;
                }

                const isOwner = clan.ownerId === senderId;
                const isMod = clan.moderatorIds.includes(senderId);

                if (!isOwner && !isMod) {
                    await this.mcService.updateMessage(
                        repliedMessage,
                        getErrorMessage(
                            'Bạn không có quyền dùng lệnh này',
                            'Lệnh này chỉ dành cho chủ sở hữu và người quản lý nha.',
                        ),
                    );
                    return;
                }
            }

            await command.execute({ event, repliedMessage, args });
        } catch (error) {
            console.error('❌ Lỗi khi thực hiện lệnh `', commandName, '` | root:', error);
            this.miscService.handleCommandError({ event, repliedMessage: repliedMessage!, args });
        }
    }
}
