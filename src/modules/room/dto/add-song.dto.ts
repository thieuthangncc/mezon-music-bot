import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class AddSongDto {
    @IsString()
    @IsNotEmpty()
    songUrl: string;

    @IsString()
    @IsOptional()
    songFileName?: string;
}
