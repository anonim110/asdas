-- AlterTable
ALTER TABLE "Post" ADD COLUMN "unlockNotified" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Post_unlockAt_idx" ON "Post"("unlockAt");
