import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
    extractYoutubeVideoId,
    getYoutubeTrackInfo,
    isYoutubeUrl,
    normalizeUrl,
    TrackInfo,
} from '@/utils/youtube.util';
import { AudioProcessingService } from './audio-processing.service';
import { CloudinaryStorageService } from './cloudinary-storage.service';
import { SongCacheService } from './song-cache.service';

export interface ResolvedSong {
    trackInfo: TrackInfo;
    youtubeUrl: string;
    youtubeVideoId: string;
    playableUrl: string;
    fromCache: boolean;
}

export interface ResolveHooks {
    onFetching?: () => Promise<void>;
    onDownloading?: (trackName: string) => Promise<void>;
    onConverting?: (trackName: string) => Promise<void>;
    onUploading?: (trackName: string) => Promise<void>;
}

@Injectable()
export class SongResolverService {
    private readonly logger = new Logger(SongResolverService.name);
    private readonly resolveLocks = new Map<string, Promise<ResolvedSong>>();

    constructor(
        private readonly songCacheService: SongCacheService,
        private readonly audioProcessingService: AudioProcessingService,
        private readonly cloudinaryStorageService: CloudinaryStorageService,
    ) {}

    async resolve(youtubeUrl: string, hooks?: ResolveHooks): Promise<ResolvedSong> {
        const normalizedUrl = normalizeUrl(youtubeUrl);

        if (!isYoutubeUrl(normalizedUrl)) {
            throw new BadRequestException('Only YouTube links are supported.');
        }

        const youtubeVideoId = extractYoutubeVideoId(normalizedUrl);
        if (!youtubeVideoId) {
            throw new BadRequestException('Cannot extract YouTube video ID from the link.');
        }

        const existingLock = this.resolveLocks.get(youtubeVideoId);
        if (existingLock) {
            return existingLock;
        }

        const resolvePromise = this.resolveInternal(normalizedUrl, youtubeVideoId, hooks);
        this.resolveLocks.set(youtubeVideoId, resolvePromise);

        try {
            return await resolvePromise;
        } finally {
            this.resolveLocks.delete(youtubeVideoId);
        }
    }

    private async resolveInternal(
        youtubeUrl: string,
        youtubeVideoId: string,
        hooks?: ResolveHooks,
    ): Promise<ResolvedSong> {
        await hooks?.onFetching?.();

        const trackInfo = await getYoutubeTrackInfo(youtubeUrl);
        if (!trackInfo) {
            throw new BadRequestException('Cannot fetch YouTube video information.');
        }

        const cachedByVideoId = await this.songCacheService.findByYoutubeVideoId(youtubeVideoId);
        if (cachedByVideoId?.oggUrl) {
            this.logger.log(`Cache hit by video ID: ${youtubeVideoId}`);
            return this.toResolvedSong(cachedByVideoId, trackInfo, youtubeUrl, true);
        }

        const cachedByTitle = await this.songCacheService.findByTitle(trackInfo.trackName);
        if (cachedByTitle?.oggUrl) {
            this.logger.log(`Cache hit by title: ${trackInfo.trackName}`);
            return this.toResolvedSong(cachedByTitle, trackInfo, youtubeUrl, true);
        }

        await hooks?.onDownloading?.(trackInfo.trackName);

        try {
            const processedAudio = await this.audioProcessingService.downloadAndConvertToOgg(
                youtubeUrl,
                youtubeVideoId,
                async () => {
                    await hooks?.onConverting?.(trackInfo.trackName);
                },
            );

            const resolvedTrackInfo: TrackInfo = {
                ...trackInfo,
                durationSeconds: processedAudio.durationSeconds ?? trackInfo.durationSeconds,
            };
            const filename = `${youtubeVideoId}.ogg`;

            await hooks?.onUploading?.(trackInfo.trackName);

            const uploaded = await this.cloudinaryStorageService.uploadOgg(
                processedAudio.oggPath,
                filename,
            );

            const cachedSong = await this.songCacheService.upsert({
                id: `song-${youtubeVideoId}`,
                title: resolvedTrackInfo.trackName,
                youtubeUrl,
                youtubeVideoId,
                oggUrl: uploaded.url,
                trackInfo: resolvedTrackInfo,
            });

            this.logger.log(
                `Cached new song → title="${trackInfo.trackName}", oggUrl=${cachedSong.oggUrl}`,
            );

            return {
                trackInfo: resolvedTrackInfo,
                youtubeUrl,
                youtubeVideoId,
                playableUrl: cachedSong.oggUrl,
                fromCache: false,
            };
        } finally {
            await this.audioProcessingService.cleanup(youtubeVideoId);
        }
    }

    private toResolvedSong(
        cachedSong: {
            oggUrl: string;
            title: string;
            thumbnailUrl?: string | null;
            authorName?: string | null;
            authorUrl?: string | null;
            providerName?: string | null;
            durationSeconds?: number | null;
        },
        fetchedTrackInfo: TrackInfo,
        youtubeUrl: string,
        fromCache: boolean,
    ): ResolvedSong {
        const trackInfo: TrackInfo = {
            trackName: cachedSong.title,
            thumbnailUrl: cachedSong.thumbnailUrl ?? fetchedTrackInfo.thumbnailUrl,
            authorName: cachedSong.authorName ?? fetchedTrackInfo.authorName,
            authorUrl: cachedSong.authorUrl ?? fetchedTrackInfo.authorUrl,
            providerName: cachedSong.providerName ?? fetchedTrackInfo.providerName,
            durationSeconds: cachedSong.durationSeconds ?? fetchedTrackInfo.durationSeconds,
        };

        return {
            trackInfo,
            youtubeUrl,
            youtubeVideoId: extractYoutubeVideoId(youtubeUrl) ?? '',
            playableUrl: cachedSong.oggUrl,
            fromCache,
        };
    }
}
