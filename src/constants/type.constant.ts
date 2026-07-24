import {
    ApiMessageAttachment,
    ApiMessageMention,
    ApiMessageReaction,
    ApiMessageRef,
    ChannelMessage,
    ChannelMessageContent,
} from 'mezon-sdk';
import { Message } from 'mezon-sdk/dist/cjs/mezon-client/structures/Message';

export type ChannelMessageEvent = {
    id?: string;
    avatar?: string;
    channel_id?: string;
    mode?: number;
    channel_label?: string;
    clan_id?: string;
    code?: number;
    message_id?: string;
    sender_id?: string;
    update_time?: string;
    clan_logo?: string;
    category_name?: string;
    username?: string;
    clan_nick?: string;
    clan_avatar?: string;
    display_name?: string;
    content?: ChannelMessageContent;
    reactions?: Array<ApiMessageReaction>;
    mentions?: Array<ApiMessageMention>;
    attachments?: Array<ApiMessageAttachment>;
    referenced_message?: ChannelMessage;
    references?: Array<ApiMessageRef>;
    hide_editted?: boolean;
    is_public?: boolean;
    create_time_seconds?: number;
    update_time_seconds?: number;
    topic_id?: string;
};

export type TokenSendEvent = {
    sender_id: string;
    sender_name: string;
    receiver_id: string;
    amount: number;
    note: string;
    extra_attribute: string;
    transaction_id: string;
};

export type MessageButtonClickedEvent = {
    message_id?: string;
    messageId?: string;
    channel_id?: string;
    channelId?: string;
    button_id?: string;
    buttonId?: string;
    sender_id?: string;
    senderId?: string;
    user_id?: string;
    userId?: string;
    extra_data?: string;
    extraData?: string;
};
export type BlackjackPhase = 'request' | 'playing' | 'finished';

export interface InteractiveMessage {
    userId: number | string;
    message: Message;
    expireTimer: NodeJS.Timeout | null;
    type: string;
    participants?: string[];
    challengerId?: string;
    opponentId?: string;
    challengerName?: string;
    opponentName?: string;
    phase?: 'request' | 'playing';
    choices?: Record<string, 'keo' | 'bua' | 'bao'>;
    /** Xì Dách (blackjack) — optional game state */
    bjPhase?: BlackjackPhase;
    bjDeck?: string[];
    bjPlayerHand?: string[];
    bjDealerHand?: string[];
    bjTurn?: 'player' | 'dealer';
    bjPlayerEphemeralId?: string;
    bjDealerEphemeralId?: string;
    bjPlayerStood?: boolean;
    bjDealerStood?: boolean;
}

export interface AsyncMutexMsg {
    userId: number;
    type: string;
}

export interface StreamingParams {
    ChannelId: string;
    Password?: string;
    FileUrl?: string;
}

export interface SocketMessaage {
    ClanId: string;
    ChannelId: string;
    UserId: string;
    Value: StreamingParams;
    Key: string;
}