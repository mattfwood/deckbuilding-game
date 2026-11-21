-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('active', 'finished');

-- CreateEnum
CREATE TYPE "PlayerKind" AS ENUM ('human', 'bot');

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "seed" TEXT NOT NULL,
    "status" "GameStatus" NOT NULL DEFAULT 'active',
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GamePlayer" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "seat" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "PlayerKind" NOT NULL,
    "guestId" TEXT,

    CONSTRAINT "GamePlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameAction" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "seat" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GamePlayer_guestId_idx" ON "GamePlayer"("guestId");

-- CreateIndex
CREATE UNIQUE INDEX "GamePlayer_gameId_seat_key" ON "GamePlayer"("gameId", "seat");

-- CreateIndex
CREATE UNIQUE INDEX "GameAction_gameId_seq_key" ON "GameAction"("gameId", "seq");

-- AddForeignKey
ALTER TABLE "GamePlayer" ADD CONSTRAINT "GamePlayer_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameAction" ADD CONSTRAINT "GameAction_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
