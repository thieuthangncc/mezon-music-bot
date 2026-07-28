import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { stat } from 'node:fs/promises';

export interface CloudinaryUploadResult {
    url: string;
    filename: string;
    size: number;
}

@Injectable()
export class CloudinaryStorageService {
    private readonly logger = new Logger(CloudinaryStorageService.name);
    private readonly folder: string;

    constructor(private readonly configService: ConfigService) {
        cloudinary.config({
            cloud_name: this.configService.getOrThrow<string>('CLOUDINARY_CLOUD_NAME'),
            api_key: this.configService.getOrThrow<string>('CLOUDINARY_API_KEY'),
            api_secret: this.configService.getOrThrow<string>('CLOUDINARY_API_SECRET'),
            secure: true,
        });

        this.folder = this.configService.get<string>('CLOUDINARY_FOLDER') ?? 'peonyy-music';
    }

    async uploadOgg(filePath: string, filename: string): Promise<CloudinaryUploadResult> {
        const fileStats = await stat(filePath);
        const publicId = filename.replace(/\.ogg$/i, '');

        this.logger.log(
            `[Cloudinary] Upload INPUT: ${JSON.stringify(
                {
                    folder: this.folder,
                    publicId,
                    filePath,
                    size: fileStats.size,
                },
                null,
                2,
            )}`,
        );

        const result = await cloudinary.uploader.upload(filePath, {
            resource_type: 'video',
            folder: this.folder,
            public_id: publicId,
            overwrite: true,
        });

        const uploadResult: CloudinaryUploadResult = {
            url: result.secure_url,
            filename,
            size: result.bytes ?? fileStats.size,
        };

        this.logger.log(`[Cloudinary] Upload OUTPUT: ${JSON.stringify(uploadResult, null, 2)}`);

        return uploadResult;
    }
}
