"use client";

import { useState } from "react";
import { BOT_NAMES } from "./useRealmGame";

export function NewGameForm({ onStart }: { onStart: (name: string, bots: number) => void }) {
  const [name, setName] = useState("Player");
  const [bots, setBots] = useState(1);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-12">
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
          onStart(name, bots);
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
            {[1, 2, 3].map((n) => (
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
                {n} bot{n > 1 ? "s" : ""}
              </label>
            ))}
          </div>
          <span className="text-xs font-normal text-stone-500">
            vs {BOT_NAMES.slice(0, bots).join(", ")}
          </span>
        </fieldset>
        <button
          type="submit"
          className="rounded-md bg-stone-900 px-4 py-2.5 font-medium text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300"
        >
          Start game
        </button>
      </form>
    </main>
  );
}
