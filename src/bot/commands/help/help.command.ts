import { Injectable } from '@nestjs/common';
import { BotCommand, CommandContext } from '../command.interface';
import { MezonClientService } from '@/libs/mezon-client/mezon-client.service';
import { MiscService } from '@/modules/misc/misc.service';
import { getEmbedMessage } from '@/utils';

@Injectable()
export class HelpCommand implements BotCommand {
    name = 'help';
    isPublic = true;

    constructor(
        private readonly mcService: MezonClientService,
        private readonly miscService: MiscService,
    ) {}

    async execute(ctx: CommandContext) {
        const { repliedMessage } = ctx;

        try {
            await this.mcService.updateMessage(
                repliedMessage,
                getEmbedMessage({
                    color: '#f6a6c1',
                    title: '🌸 Peonyy Music Bot Commands',
                    description: 'Danh sach cac lenh hien co cua bot nhac.',
                    fields: [
                        {
                            name: '🎵 Voice Playlist',
                            value:
                                '`*dj add <link>` - Them bai vao playlist\n' +
                                '`*dj play` - Phat playlist tu DB\n' +
                                '`*dj skip` - Bo bai hien tai va phat bai tiep theo\n' +
                                '`*dj stop` - Dung va xoa toan bo playlist\n' +
                                '`*dj now` - Xem bai dang phat\n' +
                                '`*dj playlist` - Xem danh sach bai hat',
                            inline: false,
                        },
                        {
                            name: '📡 Streaming',
                            value:
                                '`*dj stream <url>` - Stream media truc tiep\n' +
                                '`*dj stopstream` - Dung stream truc tiep',
                            inline: false,
                        },
                        {
                            name: '🛠️ Utility',
                            value:
                                '`*dj ping` - Kiem tra bot\n' +
                                '`*dj help` - Hien bang huong dan nay',
                            inline: false,
                        },
                        {
                            name: '⚙️ Setup',
                            value:
                                '`*dj setup` - Khoi tao clan va playlist\n' +
                                '`*dj req <link>` - Them bai vao playlist DB',
                            inline: false,
                        },
                    ],
                    footer: {
                        text: 'Tip: dung *dj help bat cu luc nao de xem lai lenh',
                    },
                }),
            );
        } catch (error) {
            console.error('❌ Lỗi khi thực hiện lệnh `help`:', error);
            await this.miscService.handleCommandError(ctx, error);
        }
    }
}
