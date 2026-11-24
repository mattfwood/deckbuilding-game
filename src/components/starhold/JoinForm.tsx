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
      <label className="flex flex-col gap-1.5">
        <span className="hud-label">Your name</span>
        <input
          className="field"
          value={name}
          maxLength={24}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <button type="submit" disabled={pending} className="btn-primary py-2.5">
        {pending ? "Joining…" : "Join game"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-rose-300">
          {error}
        </p>
      )}
    </form>
  );
}
