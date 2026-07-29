import { ChannelMessageContent, IInteractiveMessageProps } from 'mezon-sdk';
import { LOADING_EMOJI_ID } from '@/constants';
import { getRandomPastelHexColor } from '@/utils/misc.util';
import { formatDuration, TrackInfo } from '@/utils/youtube.util';
import { PlaylistSong } from '@/modules/voice-playlist/voice-playlist.service';

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

const buildTrackFields = (params: {
    trackInfo: TrackInfo;
    order: number;
    prevTrackName?: string;
    requestedBy?: string;
}) => {
    const fields: Array<{ name: string; value: string; inline?: boolean }> = [];

    fields.push({
        name: 'Thứ tự',
        value: `#${params.order}`,
        inline: true,
    });

    if (params.trackInfo.durationSeconds) {
        fields.push({
            name: 'Thời lượng',
            value: formatDuration(params.trackInfo.durationSeconds),
            inline: true,
        });
    }

    if (params.trackInfo.providerName) {
        fields.push({
            name: 'Nền tảng',
            value: params.trackInfo.providerName,
            inline: true,
        });
    }

    if (params.prevTrackName !== undefined) {
        fields.push({
            name: 'Trước đó',
            value: params.prevTrackName || '—',
            inline: false,
        });
    }

    if (params.requestedBy) {
        fields.push({
            name: 'Yêu cầu bởi',
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
    nextTrackName?: string;
    queueTotal: number;
}): ChannelMessageContent => {
    const { currentSong, trackInfo, channelName, nextTrackName, queueTotal } = params;
    const fields: Array<{ name: string; value: string; inline?: boolean }> = [];

    fields.push({
        name: 'Kênh thoại',
        value: channelName,
        inline: true,
    });

    fields.push({
        name: 'Hàng đợi',
        value: `#${currentSong.order} / ${queueTotal}`,
        inline: true,
    });

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
        name: 'Tiếp theo',
        value: nextTrackName ?? '—',
        inline: false,
    });

    return getEmbedMessage({
        color: getRandomPastelHexColor() as string,
        title: trackInfo.trackName,
        description: '🎵 Bot đang phát nhạc',
        url: currentSong.songUrl,
        author: trackInfo.authorName
            ? {
                  name: trackInfo.authorName,
                  url: trackInfo.authorUrl,
              }
            : undefined,
        thumbnail: trackInfo.thumbnailUrl ? { url: trackInfo.thumbnailUrl } : undefined,
        image: { url: "https://res.cloudinary.com/q1lwsiha/image/upload/v1785292413/placidplace-equalizer-10278_512_odeznc.gif" },
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
