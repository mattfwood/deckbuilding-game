"use client";

import { useState, useTransition } from "react";
import { BOT_NAMES } from "@/engine";
import { createGameAction, createLobbyAction } from "@/app/actions";

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
        <h1 className="text-4xl font-bold tracking-tight">Realm</h1>
        <p className="mt-2 text-stone-600 dark:text-stone-400">
          A deck-building card game. Start with a humble deck, buy better cards, and claim the most
          victory points before the Capitals run out.
        </p>
      </div>
      <form
        className="flex flex-col gap-4"
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
        <label className="flex flex-col gap-1 text-sm font-medium">
          Your name
          <input
            className="rounded-md border border-stone-300 bg-transparent px-3 py-2 font-normal dark:border-stone-600"
            value={name}
            maxLength={24}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <fieldset className="flex flex-col gap-1 text-sm font-medium">
          <legend className="mb-1">Opponents</legend>
          <div className="flex gap-2">
            {[1, 2, 3, FRIENDS].map((n) => (
              <label
                key={n}
                className={`flex-1 cursor-pointer rounded-md border px-3 py-2 text-center font-normal ${
                  bots === n
                    ? "border-stone-900 bg-stone-900 text-white dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900"
                    : "border-stone-300 dark:border-stone-600"
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
          <span className="text-xs font-normal text-stone-500">
            {bots === FRIENDS
              ? "You'll get an invite link to share. Bots can fill empty seats."
              : `vs ${BOT_NAMES.slice(0, bots).join(", ")}`}
          </span>
        </fieldset>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-stone-900 px-4 py-2.5 font-medium text-white hover:bg-stone-700 disabled:opacity-60 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300"
        >
          {pending ? "Starting…" : bots === FRIENDS ? "Create game" : "Start game"}
        </button>
        {error && (
          <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">
            {error}
          </p>
        )}
      </form>
    </section>
  );
}
