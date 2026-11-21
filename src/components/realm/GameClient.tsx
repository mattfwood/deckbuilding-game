"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Action } from "@/engine";
import { actAction, stepBotAction, type GameResult } from "@/app/actions";
import type { GameSnapshot } from "@/server/games";
import { Board } from "./Board";

const BOT_DELAY_MS = 300;

/**
 * Plays a game stored on the server. Every move goes to the server, which
 * validates it and answers with this player's view; the browser never holds
 * the full game state. Bots move one action per request so their turns animate.
 */
export function GameClient({ initial }: { initial: GameSnapshot }) {
  const [snap, setSnap] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  // Bumped to retry a bot move after an error is dismissed.
  const [retry, setRetry] = useState(0);
  // One request at a time: clicks made while one is in flight are dropped.
  const inFlight = useRef(false);

  const send = useCallback(async (call: () => Promise<GameResult>) => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const result = await call();
      const next = result.snapshot;
      // Never step backwards if an older answer arrives late.
      if (next) setSnap((cur) => (next.seq >= cur.seq ? next : cur));
      setError(result.ok ? null : result.error);
    } catch {
      setError("Couldn't reach the server. Dismiss to try again.");
    } finally {
      inFlight.current = false;
    }
  }, []);

  const act = useCallback(
    (...actions: Action[]) => void send(() => actAction(snap.gameId, actions)),
    [send, snap.gameId],
  );

  const actor = snap.view.actor;
  const botToMove = actor !== null && snap.seats[actor].kind === "bot";
  useEffect(() => {
    if (!botToMove || error) return;
    const timer = setTimeout(() => void send(() => stepBotAction(snap.gameId)), BOT_DELAY_MS);
    return () => clearTimeout(timer);
    // `snap` (not just seq) so a dropped or no-op step still schedules the next one.
  }, [botToMove, error, retry, send, snap]);

  return (
    <Board
      view={snap.view}
      error={error}
      act={act}
      onDismissError={() => {
        setError(null);
        setRetry((n) => n + 1);
      }}
    />
  );
}
