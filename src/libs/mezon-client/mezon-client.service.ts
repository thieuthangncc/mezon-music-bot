import { Injectable, OnModuleInit } from '@nestjs/common';
import { ChannelMessageContent, MezonClient } from 'mezon-sdk';
import { Message } from 'mezon-sdk/dist/cjs/mezon-client/structures/Message';
import { StreamingService } from '@/modules/streaming/streaming.service';

@Injectable()
export class MezonClientService implements OnModuleInit {
    private client: MezonClient;

    constructor(private readonly streamingService: StreamingService) {
        this.client = new MezonClient({
            token: process.env.MEZON_BOT_TOKEN as string,
            botId: process.env.MEZON_BOT_ID as string,
        });
    }

    async onModuleInit() {
        try {
            const result = await this.client.login();
            const data = JSON.parse(result);
            this.streamingService.connect(data.token);
            console.log('🌸 Bot đã được khởi động!');
        } catch (error) {
            console.error('❌ Lỗi khi đăng nhập bot:', error);
        }
    }

    getClient(): MezonClient {
        return this.client;
    }

    async sendChannelMessage(channelId: string, messageContent: ChannelMessageContent) {
        try {
            const channel = await this.client.channels.fetch(channelId);

            await channel.send(messageContent);
        } catch (error) {
            console.error('❌ Lỗi khi gửi tin nhắn:', error);
        }
    }

    async replyMessage(channelId: string, messageId: string, messageContent: ChannelMessageContent) {
        try {
            const channel = await this.client.channels.fetch(channelId);
            const messageFetched = await channel.messages.fetch(messageId);

            return await messageFetched.reply(messageContent);
        } catch (error) {
            console.error('❌ Lỗi khi trả lời tin nhắn:', error);
        }
    }

    async updateMessage(message: Message, messageContent: ChannelMessageContent) {
        try {
            return await message.update(messageContent);
        } catch (error) {
            console.error('❌ Lỗi khi cập nhật tin nhắn:', error);
        }
    }

    async sendEphemeralMessage(
        channelId: string,
        receiverId: string,
        messageContent: ChannelMessageContent,
    ) {
        try {
            const channel = await this.client.channels.fetch(channelId);
            return await channel.sendEphemeral(
                receiverId,
                messageContent,
            );
        } catch (error) {
            console.error('❌ Lỗi khi gửi tin nhắn tạm thời:', error);
        }
    }

    async updateEphemeralMessage(
        channelId: string,
        receiverId: string,
        messageId: string,
        messageContent: ChannelMessageContent,
    ) {
        try {
            const channel = await this.client.channels.fetch(channelId);
            return await channel.updateEphemeral(
                receiverId,
                messageContent,
                messageId,
            );
        } catch (error) {
            console.error('❌ Lỗi khi cập nhật tin nhắn tạm thời:', error);
            throw error;
        }
    }

    async deleteEphemeralMessage(channelId: string, receiverId: string, messageId: string) {
        try {
            const channel = await this.client.channels.fetch(channelId);
            return await channel.deleteEphemeral(receiverId, messageId);
        } catch (error) {
            console.error('❌ Lỗi khi xóa tin nhắn tạm thời:', error);
        }
    }
}
