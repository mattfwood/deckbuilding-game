"use client";

import { useState, useTransition } from "react";
import { joinGameAction } from "@/app/actions";

/** Takes a seat in a lobby; the server then redirects into the game. */
export function JoinForm({ code }: { code: string }) {
  const [name, setName] = useState("Player");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await joinGameAction({ code, name });
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
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-stone-900 px-4 py-2.5 font-medium text-white hover:bg-stone-700 disabled:opacity-60 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300"
      >
        {pending ? "Joining…" : "Join game"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">
          {error}
        </p>
      )}
    </form>
  );
}
