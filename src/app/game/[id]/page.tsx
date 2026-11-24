import { Suspense } from "react";
import { notFound } from "next/navigation";
import { GameClient } from "@/components/starhold/GameClient";
import { GameNotFoundError, type GameSnapshot } from "@/server/games";
import { gameService, getGuestId } from "@/server/guest";

export default function GamePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="mx-auto px-4 py-12 text-sm text-dim">Loading game…</p>}>
      <Game params={params} />
    </Suspense>
  );
}

async function Game({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guestId = await getGuestId();
  if (!guestId) notFound();

  let snapshot: GameSnapshot;
  try {
    snapshot = await gameService().getSnapshot(id, guestId);
  } catch (e) {
    if (e instanceof GameNotFoundError) notFound();
    throw e;
  }
  return <GameClient initial={snapshot} />;
}
