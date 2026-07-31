import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ApiMessageAttachment, ChannelMessageContent, MezonClient } from 'mezon-sdk';
import { Message } from 'mezon-sdk/dist/cjs/mezon-client/structures/Message';
import { TextChannel } from 'mezon-sdk/dist/cjs/mezon-client/structures/TextChannel';
import { StreamingService } from '@/modules/streaming/streaming.service';

const PLAYMEDIA_API_URL = 'https://stn.mezon.ai/api/playmedia';

export interface PlayMediaViaApiParams {
    clanId: string;
    voiceChannelId: string;
    url: string;
    participantIdentity: string;
    participantName: string;
    trackName: string;
}

@Injectable()
export class MezonClientService implements OnModuleInit {
    private readonly logger = new Logger(MezonClientService.name);
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

    async playMediaViaApi(params: PlayMediaViaApiParams): Promise<unknown> {
        const clan = this.client.clans.get(params.clanId);
        if (!clan) {
            throw new Error(`Clan ${params.clanId} not found`);
        }

        const token = (clan as { sessionToken?: string }).sessionToken;
        if (!token) {
            throw new Error('Session token not found');
        }

        const voiceChannel = (await this.client.channels.fetch(
            params.voiceChannelId,
        )) as TextChannel;

        const roomName = voiceChannel.meeting_code || voiceChannel.id;
        if (!roomName) {
            throw new Error('Channel is not a voice channel (missing meeting_code and id)');
        }

        const payload = {
            room_name: roomName,
            participant_identity: params.participantIdentity,
            participant_name: params.participantName,
            url: params.url,
            name: params.trackName,
        };

        const truncatedUrl =
            params.url.length > 200 ? `${params.url.slice(0, 200)}...` : params.url;

        this.logger.log(
            `[playMediaViaApi] request: ${JSON.stringify({
                voiceChannelId: params.voiceChannelId,
                clanId: params.clanId,
                channelId: voiceChannel.id,
                meeting_code: voiceChannel.meeting_code ?? null,
                room_name: roomName,
                participant_identity: params.participantIdentity,
                participant_name: params.participantName,
                trackName: params.trackName,
                url: truncatedUrl,
            })}`,
        );

        const response = await fetch(PLAYMEDIA_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });

        const responseText = await response.text();

        if (!response.ok) {
            this.logger.error(
                `[playMediaViaApi] failed (${response.status} ${response.statusText}): ${responseText}`,
            );
            throw new Error(
                `playMedia API failed (${response.status} ${response.statusText}): ${responseText}`,
            );
        }

        let result: unknown = responseText;
        if (responseText) {
            try {
                result = JSON.parse(responseText);
            } catch {
                // keep raw text
            }
        }

        this.logger.log(`[playMediaViaApi] success: ${JSON.stringify(result)}`);
        return result;
    }

    leaveVoiceChannel(clanId: string, voiceChannelId: string) {
        const botId = process.env.MEZON_BOT_ID as string;
        const socket = (this.client as MezonClient & { socketManager?: { getSocket: () => any } })
            .socketManager?.getSocket();

        socket
            ?.writeVoiceLeaved?.(botId, clanId, voiceChannelId, botId)
            ?.catch?.(() => {});
    }

    async sendChannelMessage(channelId: string, messageContent: ChannelMessageContent) {
        try {
            const channel = await this.client.channels.fetch(channelId);

            await channel.send(messageContent);
        } catch (error) {
            console.error('❌ Lỗi khi gửi tin nhắn:', error);
        }
    }
    
    async sendUploadChannelMessage(
        messageContent: ChannelMessageContent,
        attachments: ApiMessageAttachment[],
    ): Promise<Message | undefined> {
        try {
            const channel = await this.client.channels.fetch(process.env.UPLOAD_CHANNEL_ID as string);
            return await channel.send(messageContent, [], attachments);
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
