-- AlterTable
ALTER TABLE "Clan" ADD COLUMN "moderatorIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Playlist" ADD COLUMN "clanId" TEXT;

-- Migrate playlist ownership from StreamingChannel to Clan
UPDATE "Playlist" p
SET "clanId" = sc."clanId"
FROM "StreamingChannel" sc
WHERE p."streamingChannelId" = sc."id";

-- DropForeignKey
ALTER TABLE "Playlist" DROP CONSTRAINT "Playlist_streamingChannelId_fkey";

-- AlterTable
ALTER TABLE "Playlist" DROP COLUMN "streamingChannelId";

-- AlterTable
ALTER TABLE "Playlist" ALTER COLUMN "clanId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Playlist_clanId_key" ON "Playlist"("clanId");

-- AddForeignKey
ALTER TABLE "Playlist" ADD CONSTRAINT "Playlist_clanId_fkey" FOREIGN KEY ("clanId") REFERENCES "Clan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DropTable
DROP TABLE "RoomMember";

-- DropTable
DROP TABLE "StreamingChannel";
