import { ChannelType } from 'mezon-sdk';
import type { MezonClient } from 'mezon-sdk';

export interface UserVoiceChannel {
    channelId: string;
    channelName: string;
}

export async function getUserVoiceChannel(
    client: MezonClient,
    clanId: string,
    userId: string,
): Promise<UserVoiceChannel | null> {
    const clan = client.clans.get(clanId);
    if (!clan) {
        return null;
    }

    const voiceUsers = await clan.listChannelVoiceUsers();
    const userVoice = voiceUsers.voice_channel_users?.find((vcu) =>
        vcu.user_ids?.includes(userId),
    );

    if (!userVoice?.channel_id) {
        return null;
    }

    const voiceChannel = await client.channels.fetch(userVoice.channel_id);
    if (voiceChannel.channel_type !== ChannelType.CHANNEL_TYPE_MEZON_VOICE) {
        return null;
    }

    return {
        channelId: userVoice.channel_id,
        channelName: voiceChannel.name || userVoice.channel_id,
    };
}
