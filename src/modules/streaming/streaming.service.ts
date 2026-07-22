import { StreamingAction } from '@/constants/enum.constant';
import { SocketMessaage, StreamingParams } from '@/constants/type.constant';
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { WebSocket } from 'ws';

@Injectable()
export class StreamingService implements OnModuleDestroy {
    private ws: WebSocket | null = null;
    private token = '';
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 10;
    private reconnectDelay = 2000;
    private pendingQueue: Array<() => void> = [];
    private shouldReconnect = true;

    connect(token: string) {
        this.token = token;
        this.shouldReconnect = true;
        this.reconnectAttempts = 0;
        this.createConnection();
    }

    private createConnection() {
        this.ws?.close();
        this.ws = new WebSocket(`wss://stn.mezon.ai/ws?token=${this.token}`);

        this.ws.on('open', () => {
            this.reconnectAttempts = 0;
            console.log('🌸 Streaming WebSocket connected');
            this.flushQueue();
        });

        this.ws.on('close', () => {
            console.log('🌸 Streaming WebSocket disconnected');
            this.ws = null;
            if (this.shouldReconnect) {
                this.scheduleReconnect();
            }
        });

        this.ws.on('error', (error) => {
            console.error('❌ Streaming WebSocket error:', error);
        });
    }

    private scheduleReconnect() {
        this.reconnectAttempts++;
        if (this.reconnectAttempts > this.maxReconnectAttempts) {
            console.error('❌ Max reconnect attempts reached');
            return;
        }
        const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);
        console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        setTimeout(() => this.createConnection(), delay);
    }

    private flushQueue() {
        if (this.pendingQueue.length === 0) return;
        const queue = this.pendingQueue;
        this.pendingQueue = [];
        queue.forEach(fn => fn());
    }

    getSocket(): WebSocket | null {
        return this.ws;
    }

    private buildMessage(params: StreamingParams, key: string): SocketMessaage {
        return {
            ClanId: '2079770589312061440',
            ChannelId: '2079770751530962944',
            UserId: process.env.MEZON_BOT_ID as string,
            Value: params,
            Key: key,
        };
    }

    private sendOrQueue(params: StreamingParams, key: string) {
        const message = this.buildMessage(params, key);
        const json = JSON.stringify(message);

        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(json);
            return;
        }

        this.pendingQueue.push(() => {
            if (this.ws?.readyState === WebSocket.OPEN) {
                this.ws.send(json);
            }
        });

        if (!this.ws || this.ws.readyState >= WebSocket.CLOSING) {
            this.createConnection();
        }
    }

    playStreaming(params: StreamingParams) {
        this.sendOrQueue(params, StreamingAction.CONNECT_PUBLISHER);
    }

    stopStreaming(params: StreamingParams) {
        this.sendOrQueue(params, StreamingAction.STOP_PUBLISHER);
    }

    disconnect() {
        this.shouldReconnect = false;
        this.pendingQueue = [];
        this.ws?.close();
        this.ws = null;
    }

    onModuleDestroy() {
        this.disconnect();
    }
}
