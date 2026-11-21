-- Lobby support: games can wait for players, are joined by invite code, and
-- carry a version that bumps on every change.

-- AlterEnum
ALTER TYPE "GameStatus" ADD VALUE 'lobby';

-- AlterTable: add inviteCode nullable first so existing games can be backfilled.
ALTER TABLE "Game" ADD COLUMN "inviteCode" TEXT,
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;

UPDATE "Game"
SET "inviteCode" = md5(random()::text || id),
    "version" = (SELECT count(*) FROM "GameAction" a WHERE a."gameId" = "Game".id);

ALTER TABLE "Game" ALTER COLUMN "inviteCode" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Game_inviteCode_key" ON "Game"("inviteCode");

-- CreateIndex
CREATE UNIQUE INDEX "GamePlayer_gameId_guestId_key" ON "GamePlayer"("gameId", "guestId");
