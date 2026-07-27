import {
    Body,
    Controller,
    Get,
    Param,
    Post,
} from '@nestjs/common';
import { RoomService } from './room.service';
import { JoinRoomDto } from './dto/join-room.dto';
import { LeaveRoomDto } from './dto/leave-room.dto';
import { AddSongDto } from './dto/add-song.dto';

@Controller('room')
export class RoomController {
    constructor(private readonly roomService: RoomService) {}

    @Get()
    getRooms() {
        return this.roomService.getRooms();
    }

    @Get(':id')
    getRoom(@Param('id') id: string) {
        return this.roomService.getRoom(id);
    }

    @Post(':id/join')
    joinRoom(@Param('id') id: string, @Body() dto: JoinRoomDto) {
        return this.roomService.joinRoom(id, dto.userId);
    }

    @Post(':id/leave')
    leaveRoom(@Param('id') id: string, @Body() dto: LeaveRoomDto) {
        return this.roomService.leaveRoom(id, dto.userId);
    }

    @Post(':id/playlist')
    addSong(@Param('id') id: string, @Body() dto: AddSongDto) {
        return this.roomService.addSong(id, dto.songUrl, dto.songFileName);
    }
}
