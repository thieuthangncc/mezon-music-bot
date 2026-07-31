-- AlterTable
ALTER TABLE "PlaylistSong" ADD COLUMN "cachedSongId" TEXT,
ADD COLUMN "isPlayed" BOOLEAN NOT NULL DEFAULT false;

-- Backfill CachedSong from existing PlaylistSong rows
INSERT INTO "CachedSong" (
    "id",
    "title",
    "youtubeUrl",
    "youtubeVideoId",
    "oggUrl",
    "thumbnailUrl",
    "authorName",
    "durationSeconds",
    "createdAt",
    "updatedAt"
)
SELECT
    'song-migrated-' || ps."id",
    COALESCE(ps."title", ps."songUrl"),
    ps."songUrl",
    'migrated-' || ps."id",
    COALESCE(ps."playableUrl", ''),
    ps."thumbnailUrl",
    ps."authorName",
    ps."durationSeconds",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "PlaylistSong" ps
WHERE NOT EXISTS (
    SELECT 1 FROM "CachedSong" cs WHERE cs."youtubeUrl" = ps."songUrl"
);

-- Link PlaylistSong to CachedSong
UPDATE "PlaylistSong" ps
SET "cachedSongId" = cs."id"
FROM "CachedSong" cs
WHERE cs."youtubeUrl" = ps."songUrl"
  AND ps."cachedSongId" IS NULL;

-- AlterTable
ALTER TABLE "PlaylistSong" ALTER COLUMN "cachedSongId" SET NOT NULL;

ALTER TABLE "PlaylistSong" DROP COLUMN "songUrl",
DROP COLUMN "playableUrl",
DROP COLUMN "title",
DROP COLUMN "thumbnailUrl",
DROP COLUMN "authorName",
DROP COLUMN "durationSeconds";

-- AddForeignKey
ALTER TABLE "PlaylistSong" ADD CONSTRAINT "PlaylistSong_cachedSongId_fkey" FOREIGN KEY ("cachedSongId") REFERENCES "CachedSong"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
