"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Action } from "@/engine";
import { actAction, stepBotAction, type GameResult } from "@/app/actions";
import type { GameSnapshot } from "@/server/games";
import { Board } from "./Board";
import { Lobby } from "./Lobby";

const BOT_DELAY_MS = 300;
const POLL_MS = 1500;

/**
 * Plays a game stored on the server. Every move goes to the server, which
 * validates it and answers with this player's view; the browser never holds
 * the full game state. While someone else is to move, it polls for news.
 * Bots move one action per request so their turns animate; any seated
 * player's client may drive them (the server makes repeats harmless).
 */
export function GameClient({ initial }: { initial: GameSnapshot }) {
  const [snap, setSnap] = useState<GameSnapshot>(initial);
  const [error, setError] = useState<string | null>(null);
  const [gone, setGone] = useState(false);
  // Bumped to retry a bot move after an error is dismissed.
  const [retry, setRetry] = useState(0);
  // One request at a time: clicks made while one is in flight are dropped.
  const inFlight = useRef(false);

  // Never step backwards if an older answer arrives late.
  const accept = useCallback((next: GameSnapshot) => {
    setSnap((cur) => (next.version >= cur.version ? next : cur));
  }, []);

  const send = useCallback(
    async (call: () => Promise<GameResult>) => {
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        const result = await call();
        if (result.snapshot) accept(result.snapshot);
        else if (!result.ok && result.notFound) setGone(true);
        setError(result.ok ? null : result.error);
      } catch {
        setError("Couldn't reach the server. Dismiss to try again.");
      } finally {
        inFlight.current = false;
      }
    },
    [accept],
  );

  const act = useCallback(
    (...actions: Action[]) => void send(() => actAction(snap.gameId, actions)),
    [send, snap.gameId],
  );

  const playing = snap.status === "lobby" ? null : snap;
  const actor = playing?.view.actor ?? null;
  const botToMove = playing !== null && actor !== null && playing.seats[actor].kind === "bot";
  const myMove = playing !== null && actor === playing.view.you;

  useEffect(() => {
    if (!botToMove || error) return;
    const timer = setTimeout(() => void send(() => stepBotAction(snap.gameId)), BOT_DELAY_MS);
    return () => clearTimeout(timer);
    // `snap` (not just its version) so a dropped or no-op step still schedules the next one.
  }, [botToMove, error, retry, send, snap]);

  // Poll while we're waiting on someone else: other people in the lobby, or
  // another human's move. Not on our own move, and not once the game is over.
  const waiting = !gone && snap.status !== "finished" && !myMove && !botToMove;
  useEffect(() => {
    if (!waiting) return;
    let stopped = false;
    const timer = setInterval(async () => {
      if (document.hidden || inFlight.current) return;
      try {
        const res = await fetch(`/api/games/${snap.gameId}?v=${snap.version}`, {
          cache: "no-store",
        });
        if (stopped) return;
        if (res.status === 404) setGone(true);
        else if (res.status === 200) accept((await res.json()) as GameSnapshot);
      } catch {
        // Offline for a moment: the next tick tries again.
      }
    }, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [waiting, snap.gameId, snap.version, accept]);

  if (gone) {
    return (
      <main className="mx-auto flex max-w-md flex-col gap-4 px-4 py-12">
        <h1 className="text-2xl font-semibold text-ink">Game not found</h1>
        <p className="text-dim">It was cancelled, or you&apos;re no longer seated in it.</p>
        <Link href="/" className="text-sm underline">
          Back to your games
        </Link>
      </main>
    );
  }

  if (snap.status === "lobby") {
    return <Lobby snap={snap} send={send} error={error} onDismissError={() => setError(null)} />;
  }

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
