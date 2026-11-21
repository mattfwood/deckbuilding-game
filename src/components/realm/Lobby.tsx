"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import {
  addBotAction,
  cancelLobbyAction,
  leaveLobbyAction,
  removeSeatAction,
  startGameAction,
  type GameResult,
} from "@/app/actions";
import type { LobbySnapshot } from "@/server/games";

const button =
  "rounded-md px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40";
const primary = `${button} bg-stone-900 text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300`;
const secondary = `${button} border border-stone-300 hover:bg-stone-100 dark:border-stone-600 dark:hover:bg-stone-800`;

// The page origin, read on the client only (the server render has no window).
const noSubscribe = () => () => {};
const useOrigin = () =>
  useSyncExternalStore(
    noSubscribe,
    () => window.location.origin,
    () => "",
  );

interface LobbyProps {
  snap: LobbySnapshot;
  send: (call: () => Promise<GameResult>) => Promise<void>;
  error: string | null;
  onDismissError: () => void;
}

/** Waiting room: share the invite link, fill seats, and (host only) start. */
export function Lobby({ snap, send, error, onDismissError }: LobbyProps) {
  const origin = useOrigin();
  const [copied, setCopied] = useState(false);
  const [leaving, startLeaving] = useTransition();
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const invite = `${origin}/join/${snap.inviteCode}`;
  const full = snap.seats.length >= snap.maxSeats;
  const { gameId, isHost, you } = snap;

  async function copy() {
    try {
      await navigator.clipboard.writeText(invite);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the link is selectable text anyway.
    }
  }

  function leave() {
    startLeaving(async () => {
      // Redirects home on success; only returns on failure.
      const result = isHost ? await cancelLobbyAction(gameId) : await leaveLobbyAction(gameId, you);
      startLeaving(() => setLeaveError(result.error));
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-12">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Realm</h1>
          <p className="text-sm text-stone-600 dark:text-stone-400">Waiting for players</p>
        </div>
        <Link
          href="/"
          className="rounded-md border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100 dark:border-stone-600 dark:hover:bg-stone-800"
        >
          All games
        </Link>
      </header>

      <section aria-labelledby="invite" className="flex flex-col gap-2">
        <h2 id="invite" className="text-sm font-semibold">
          Invite link
        </h2>
        <div className="flex gap-2">
          <input
            readOnly
            value={invite}
            aria-label="Invite link"
            onFocus={(e) => e.currentTarget.select()}
            className="min-w-0 flex-1 rounded-md border border-stone-300 bg-transparent px-3 py-1.5 text-sm dark:border-stone-600"
          />
          <button className={secondary} onClick={copy}>
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <p className="text-xs text-stone-500">Anyone with this link can take an open seat.</p>
      </section>

      <section aria-labelledby="seats" className="flex flex-col gap-2">
        <h2 id="seats" className="text-sm font-semibold">
          Players ({snap.seats.length}/{snap.maxSeats})
        </h2>
        <ul className="flex flex-col divide-y divide-stone-200 rounded-md border border-stone-200 dark:divide-stone-700 dark:border-stone-700">
          {snap.seats.map((seat, i) => (
            <li key={i} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span>
                {seat.name}
                <span className="ml-2 text-xs text-stone-500">
                  {[i === 0 && "host", seat.kind === "bot" && "bot", i === you && "you"]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
              {isHost && i !== 0 && (
                <button
                  className="text-xs text-stone-500 underline hover:text-stone-900 dark:hover:text-stone-100"
                  onClick={() => send(() => removeSeatAction(gameId, i))}
                  aria-label={`Remove ${seat.name}`}
                >
                  Remove
                </button>
              )}
            </li>
          ))}
          {Array.from({ length: snap.maxSeats - snap.seats.length }, (_, i) => (
            <li key={`open-${i}`} className="px-3 py-2 text-sm text-stone-400">
              Open seat
            </li>
          ))}
        </ul>
      </section>

      {(error || leaveError) && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-md border border-rose-400 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:bg-rose-950/40 dark:text-rose-200"
        >
          {error ?? leaveError}
          <button
            className="text-xs underline"
            onClick={() => {
              onDismissError();
              setLeaveError(null);
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {isHost ? (
          <>
            <button
              className={primary}
              disabled={snap.seats.length < 2}
              onClick={() => send(() => startGameAction(gameId))}
            >
              Start game
            </button>
            <button
              className={secondary}
              disabled={full}
              onClick={() => send(() => addBotAction(gameId))}
            >
              Add a bot
            </button>
            <button className={secondary} disabled={leaving} onClick={leave}>
              Cancel game
            </button>
          </>
        ) : (
          <>
            <p className="self-center text-sm text-stone-500">
              Waiting for {snap.seats[0]?.name} to start the game…
            </p>
            <button className={secondary} disabled={leaving} onClick={leave}>
              Leave
            </button>
          </>
        )}
      </div>
    </main>
  );
}
