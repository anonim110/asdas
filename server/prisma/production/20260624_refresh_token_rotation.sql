-- Backfill the session-family fields before Prisma makes sessionId required.
-- This is idempotent so Render can run it on every deployment.
ALTER TABLE "RefreshToken"
  ADD COLUMN IF NOT EXISTS "sessionId" TEXT;

ALTER TABLE "RefreshToken"
  ADD COLUMN IF NOT EXISTS "revokedAt" TIMESTAMP(3);

UPDATE "RefreshToken"
SET "sessionId" = "id"
WHERE "sessionId" IS NULL;

ALTER TABLE "RefreshToken"
  ALTER COLUMN "sessionId" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "RefreshToken_sessionId_idx"
  ON "RefreshToken"("sessionId");
