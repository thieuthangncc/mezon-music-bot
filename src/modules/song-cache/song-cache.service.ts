import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/libs/prisma/prisma.service';
import { TrackInfo } from '@/utils/youtube.util';

export interface UpsertCachedSongInput {
    id: string;
    title: string;
    youtubeUrl: string;
    youtubeVideoId: string;
    oggUrl: string;
    trackInfo: TrackInfo;
}

@Injectable()
export class SongCacheService {
    constructor(private readonly prisma: PrismaService) {}

    findByYoutubeVideoId(youtubeVideoId: string) {
        return this.prisma.cachedSong.findUnique({
            where: { youtubeVideoId },
        });
    }

    findByTitle(title: string) {
        return this.prisma.cachedSong.findFirst({
            where: {
                title: {
                    equals: title.trim(),
                    mode: 'insensitive',
                },
            },
        });
    }

    upsert(input: UpsertCachedSongInput) {
        const { trackInfo, ...data } = input;

        return this.prisma.cachedSong.upsert({
            where: { youtubeVideoId: data.youtubeVideoId },
            create: {
                ...data,
                thumbnailUrl: trackInfo.thumbnailUrl,
                authorName: trackInfo.authorName,
                authorUrl: trackInfo.authorUrl,
                providerName: trackInfo.providerName,
                durationSeconds: trackInfo.durationSeconds,
            },
            update: {
                title: data.title,
                youtubeUrl: data.youtubeUrl,
                oggUrl: data.oggUrl,
                thumbnailUrl: trackInfo.thumbnailUrl,
                authorName: trackInfo.authorName,
                authorUrl: trackInfo.authorUrl,
                providerName: trackInfo.providerName,
                durationSeconds: trackInfo.durationSeconds,
            },
        });
    }
}
