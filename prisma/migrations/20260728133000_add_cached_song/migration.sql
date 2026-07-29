-- CreateTable
CREATE TABLE "CachedSong" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "youtubeUrl" TEXT NOT NULL,
    "youtubeVideoId" TEXT NOT NULL,
    "oggUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "authorName" TEXT,
    "authorUrl" TEXT,
    "providerName" TEXT,
    "durationSeconds" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CachedSong_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CachedSong_youtubeVideoId_key" ON "CachedSong"("youtubeVideoId");

-- CreateIndex
CREATE INDEX "CachedSong_title_idx" ON "CachedSong"("title");
