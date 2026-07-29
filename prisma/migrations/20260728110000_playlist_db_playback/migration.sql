-- AlterTable
ALTER TABLE "Playlist" ADD COLUMN "currentOrder" INTEGER,
ADD COLUMN "playbackStartedAt" TIMESTAMP(3),
ADD COLUMN "voiceChannelId" TEXT,
ADD COLUMN "voiceChannelName" TEXT;

-- AlterTable
ALTER TABLE "PlaylistSong" ADD COLUMN "playableUrl" TEXT,
ADD COLUMN "title" TEXT,
ADD COLUMN "thumbnailUrl" TEXT,
ADD COLUMN "authorName" TEXT,
ADD COLUMN "durationSeconds" INTEGER,
ADD COLUMN "requestedBy" TEXT;

-- AlterTable
ALTER TABLE "PlaylistSong" DROP COLUMN "songFileName";

-- DropForeignKey
ALTER TABLE "PlaylistSong" DROP CONSTRAINT "PlaylistSong_playlistId_fkey";

-- AddForeignKey
ALTER TABLE "PlaylistSong" ADD CONSTRAINT "PlaylistSong_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "Playlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
