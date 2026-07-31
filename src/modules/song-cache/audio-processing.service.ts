import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFile } from 'node:child_process';
import { access, mkdir, readdir, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { create } from 'youtube-dl-exec';

const execFileAsync = promisify(execFile);
const YT_DLP_BIN = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
const DEFAULT_YT_DLP_PATH = join(process.cwd(), 'node_modules/youtube-dl-exec/bin', YT_DLP_BIN);
const MAX_AUDIO_SIZE_BYTES = 10 * 1024 * 1024;
export const SONG_UNPLAYABLE_MESSAGE =
    '❌ Không thể phát bài hát này\n\n💡 Hãy thử bài khác hoặc thử lại sau nha.';

export interface ProcessedAudioResult {
    oggPath: string;
    durationSeconds?: number;
}

@Injectable()
export class AudioProcessingService implements OnModuleInit {
    private readonly logger = new Logger(AudioProcessingService.name);
    private readonly tempPath: string;
    private youtubedl = create(DEFAULT_YT_DLP_PATH);

    constructor(private readonly configService: ConfigService) {
        this.tempPath =
            this.configService.get<string>('AUDIO_TEMP_PATH') ??
            join(process.cwd(), 'storage', 'temp');
    }

    async onModuleInit() {
        await mkdir(this.tempPath, { recursive: true });
        this.youtubedl = await this.resolveYtdlp();
    }

    private async resolveYtdlp() {
        const customPath = this.configService.get<string>('YT_DLP_PATH');
        const candidates = [customPath, DEFAULT_YT_DLP_PATH, YT_DLP_BIN].filter(
            (path): path is string => Boolean(path),
        );

        for (const candidate of candidates) {
            try {
                await access(candidate);
                this.logger.log(`Using yt-dlp at: ${candidate}`);
                return create(candidate);
            } catch {
                continue;
            }
        }

        throw new Error(
            'yt-dlp binary not found. Run `yarn postinstall` or install yt-dlp system-wide.',
        );
    }

    async downloadAndConvertToOgg(
        youtubeUrl: string,
        videoId: string,
        beforeConvert?: () => Promise<void>,
    ): Promise<ProcessedAudioResult> {
        const workDir = join(this.tempPath, videoId);
        await rm(workDir, { force: true, recursive: true });
        await mkdir(workDir, { recursive: true });

        const downloadTemplate = join(workDir, 'audio.%(ext)s');
        const oggPath = join(workDir, `${videoId}.ogg`);

        this.logger.log(`Downloading audio: ${youtubeUrl}`);
        try {
            await this.youtubedl(youtubeUrl, {
                extractAudio: true,
                audioFormat: 'best',
                output: downloadTemplate,
                noPlaylist: true,
            });
        } catch (error) {
            this.logger.error(`Download failed for ${videoId}`, error);
            throw new BadRequestException(SONG_UNPLAYABLE_MESSAGE);
        }

        const files = await readdir(workDir);
        const downloadedFile = files.find((file) => file.startsWith('audio.') && !file.endsWith('.ogg'));

        if (!downloadedFile) {
            throw new BadRequestException(SONG_UNPLAYABLE_MESSAGE);
        }

        const downloadedPath = join(workDir, downloadedFile);
        const downloadedStats = await stat(downloadedPath);
        if (downloadedStats.size > MAX_AUDIO_SIZE_BYTES) {
            this.logger.warn(
                `Audio file too large for ${videoId}: ${downloadedStats.size} bytes (max ${MAX_AUDIO_SIZE_BYTES})`,
            );
            throw new BadRequestException(SONG_UNPLAYABLE_MESSAGE);
        }

        this.logger.log(`Converting to OGG: ${videoId}`);
        await beforeConvert?.();
        try {
            await execFileAsync(
                'ffmpeg',
                ['-y', '-i', downloadedPath, '-c:a', 'libvorbis', '-q:a', '4', oggPath],
                { timeout: 600_000 },
            );
        } catch (error) {
            this.logger.error(`Convert failed for ${videoId}`, error);
            throw new BadRequestException(SONG_UNPLAYABLE_MESSAGE);
        }

        const durationSeconds = await this.getAudioDurationSeconds(oggPath);
        this.logger.log(
            `Converted OGG duration for ${videoId}: ${durationSeconds ?? 'unknown'} seconds`,
        );

        return {
            oggPath,
            durationSeconds,
        };
    }

    async cleanup(videoId: string) {
        await rm(join(this.tempPath, videoId), { force: true, recursive: true });
    }

    private async getAudioDurationSeconds(filePath: string): Promise<number | undefined> {
        try {
            const { stdout } = await execFileAsync('ffprobe', [
                '-v',
                'error',
                '-show_entries',
                'format=duration',
                '-of',
                'default=noprint_wrappers=1:nokey=1',
                filePath,
            ]);

            const duration = Number.parseFloat(stdout.trim());
            if (!Number.isFinite(duration) || duration <= 0) {
                return undefined;
            }

            return Math.ceil(duration);
        } catch (error) {
            this.logger.warn(`Cannot detect audio duration for ${filePath}: ${String(error)}`);
            return undefined;
        }
    }
}
