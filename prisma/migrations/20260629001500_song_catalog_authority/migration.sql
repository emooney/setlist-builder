-- Add structured song catalog fields while preserving the existing body content.
ALTER TABLE "Song" ADD COLUMN "artist" TEXT NOT NULL DEFAULT 'Duran Duran';
ALTER TABLE "Song" ADD COLUMN "performedBy" TEXT NOT NULL DEFAULT 'The Duran Band';
ALTER TABLE "Song" ADD COLUMN "lyrics" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Song" ADD COLUMN "performanceNotes" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Song" ADD COLUMN "key" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Song" ADD COLUMN "tempo" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Song" ADD COLUMN "durationSeconds" INTEGER;
ALTER TABLE "Song" ADD COLUMN "tagsJson" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "Song" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;

-- Existing songs were stored as one body blob. Use that blob as initial lyrics
-- so exports continue to work from the database immediately after migration.
UPDATE "Song" SET "lyrics" = "body" WHERE "lyrics" = '' AND "body" <> '';
