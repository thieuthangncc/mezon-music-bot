import { ChannelMessageContent, IInteractiveMessageProps } from 'mezon-sdk';
import { LOADING_EMOJI_ID } from '@/constants';
import { getRandomPastelHexColor } from '@/utils/misc.util';
import { formatDuration, TrackInfo } from '@/utils/youtube.util';
import { PlaybackProgress, PlaylistSong } from '@/modules/voice-playlist/voice-playlist.service';

export const getTextMessage = (text: string): ChannelMessageContent => {
    return {
        t: text,
    };
};

export const getEmbedMessage = (embed: IInteractiveMessageProps): ChannelMessageContent => {
    return {
        embed: [embed],
    };
};

export const formatProgressBar = (percent: number, length = 12): string => {
    const filled = Math.round((percent / 100) * length);
    return `[${'█'.repeat(filled)}${'░'.repeat(length - filled)}] ${percent}%`;
};

const buildTrackFields = (params: {
    trackInfo: TrackInfo;
    order: number;
    prevTrackName?: string;
    requestedBy?: string;
}) => {
    const fields: Array<{ name: string; value: string; inline?: boolean }> = [];

    fields.push({
        name: 'Order',
        value: `#${params.order}`,
        inline: true,
    });

    if (params.trackInfo.durationSeconds) {
        fields.push({
            name: 'Duration',
            value: formatDuration(params.trackInfo.durationSeconds),
            inline: true,
        });
    }

    if (params.trackInfo.providerName) {
        fields.push({
            name: 'Platform',
            value: params.trackInfo.providerName,
            inline: true,
        });
    }

    if (params.prevTrackName !== undefined) {
        fields.push({
            name: 'Previous',
            value: params.prevTrackName || '—',
            inline: false,
        });
    }

    if (params.requestedBy) {
        fields.push({
            name: 'Requested by',
            value: params.requestedBy,
            inline: true,
        });
    }

    return fields;
};

export const getSongEmbedMessage = (params: {
    trackInfo: TrackInfo;
    description: string;
    songUrl: string;
    order: number;
    prevTrackName?: string;
    requestedBy?: string;
}): ChannelMessageContent => {
    const { trackInfo, description, songUrl, order, prevTrackName, requestedBy } = params;
    const fields = buildTrackFields({ trackInfo, order, prevTrackName, requestedBy });

    return getEmbedMessage({
        color: getRandomPastelHexColor() as string,
        title: trackInfo.trackName,
        description,
        url: songUrl,
        author: trackInfo.authorName
            ? {
                  name: trackInfo.authorName,
                  url: trackInfo.authorUrl,
              }
            : undefined,
        thumbnail: trackInfo.thumbnailUrl ? { url: trackInfo.thumbnailUrl } : undefined,
        fields: fields.length > 0 ? fields : undefined,
    });
};

export const getNowPlayingEmbedMessage = (params: {
    currentSong: PlaylistSong;
    trackInfo: TrackInfo;
    channelName: string;
    progress: PlaybackProgress | null;
    nextTrackName?: string;
    queueTotal: number;
}): ChannelMessageContent => {
    const { currentSong, trackInfo, channelName, progress, nextTrackName, queueTotal } = params;
    const fields: Array<{ name: string; value: string; inline?: boolean }> = [];

    fields.push({
        name: 'Voice channel',
        value: channelName,
        inline: true,
    });

    fields.push({
        name: 'Queue',
        value: `#${currentSong.order} / ${queueTotal}`,
        inline: true,
    });

    if (progress) {
        const elapsed = formatDuration(progress.elapsedSeconds);
        const total = trackInfo.durationSeconds
            ? formatDuration(trackInfo.durationSeconds)
            : '??:??';

        fields.push({
            name: 'Progress',
            value: `${elapsed} / ${total}\n${formatProgressBar(progress.progressPercent)}`,
            inline: false,
        });
    }

    fields.push({
        name: 'Requested by',
        value: currentSong.requestedBy,
        inline: true,
    });

    if (trackInfo.durationSeconds) {
        fields.push({
            name: 'Duration',
            value: formatDuration(trackInfo.durationSeconds),
            inline: true,
        });
    }

    fields.push({
        name: 'Next up',
        value: nextTrackName ?? '—',
        inline: false,
    });

    return getEmbedMessage({
        color: getRandomPastelHexColor() as string,
        title: trackInfo.trackName,
        description: '🎵 Now playing',
        url: currentSong.songUrl,
        author: trackInfo.authorName
            ? {
                  name: trackInfo.authorName,
                  url: trackInfo.authorUrl,
              }
            : undefined,
        thumbnail: trackInfo.thumbnailUrl ? { url: trackInfo.thumbnailUrl } : undefined,
        fields,
    });
};

export const getLoadingMessage = (): ChannelMessageContent => {
    return {
        t: '    Chờ xíu nha... 🌸',
        ej: [
            {
                emojiid: LOADING_EMOJI_ID as string,
                s: 0,
                e: 1,
            },
        ],
    };
};

export const getEmbedLoadingMessage = (title: string): ChannelMessageContent => {
    return {
        embed: [
            {
                color: getRandomPastelHexColor() as string,
                title: title,
                description: '🌸 Chờ xíu nha... 🌸',
            },
        ],
    };
};

export const getInteralErrorMessage = (): ChannelMessageContent => {
    return {
        t: '❌ Đã có lỗi xảy ra! Vui lòng liên hệ admin (thang.thieuquang) để được hỗ trợ!',
    };
};
