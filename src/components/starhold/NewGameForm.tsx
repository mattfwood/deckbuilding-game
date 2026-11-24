"use client";

import { useState, useTransition } from "react";
import { BOT_NAMES } from "@/engine";
import { createGameAction, createLobbyAction } from "@/app/actions";
import { Wordmark } from "./Wordmark";

/** The "Friends" choice: open a lobby instead of starting against bots. */
const FRIENDS = 0;

/** Creates a game on the server, which then redirects to it. */
export function NewGameForm() {
  const [name, setName] = useState("Player");
  const [bots, setBots] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <section className="flex flex-col gap-6">
      <div>
        <Wordmark as="h1" size="lg" />
        <p className="mt-2 text-dim">
          Your landing ship has touched down on a new world with a little ore and a few habitats.
          Grow your colony, outbuild your rivals, and hold the most victory points when the
          Arcologies run out.
        </p>
      </div>
      <form
        className="panel flex flex-col gap-4 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            // Only returns on failure; on success the server redirects to the new game.
            const result =
              bots === FRIENDS
                ? await createLobbyAction({ name })
                : await createGameAction({ name, botCount: bots });
            startTransition(() => setError(result.error));
          });
        }}
      >
        <label className="flex flex-col gap-1.5">
          <span className="hud-label">Your name</span>
          <input
            className="field"
            value={name}
            maxLength={24}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <fieldset className="flex flex-col gap-1.5">
          <legend className="hud-label mb-1.5">Opponents</legend>
          <div className="flex gap-2">
            {[1, 2, 3, FRIENDS].map((n) => (
              <label
                key={n}
                className={`flex-1 cursor-pointer rounded-md border px-3 py-2 text-center font-hud text-sm font-semibold tracking-wide uppercase transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-signal ${
                  bots === n
                    ? "border-signal bg-cyan-400/15 text-cyan-100 shadow-[0_0_14px_rgb(34_211_238/0.3)]"
                    : "border-cyan-300/20 text-dim hover:border-cyan-300/50"
                }`}
              >
                <input
                  type="radio"
                  name="bots"
                  className="sr-only"
                  checked={bots === n}
                  onChange={() => setBots(n)}
                />
                {n === FRIENDS ? "Friends" : `${n} bot${n > 1 ? "s" : ""}`}
              </label>
            ))}
          </div>
          <span className="text-xs font-normal text-dim">
            {bots === FRIENDS
              ? "You'll get an invite link to share. Bots can fill empty seats."
              : `vs ${BOT_NAMES.slice(0, bots).join(", ")}`}
          </span>
        </fieldset>
        <button type="submit" disabled={pending} className="btn-primary py-2.5">
          {pending ? "Starting…" : bots === FRIENDS ? "Create game" : "Start game"}
        </button>
        {error && (
          <p role="alert" className="text-sm text-rose-300">
            {error}
          </p>
        )}
      </form>
    </section>
  );
}
