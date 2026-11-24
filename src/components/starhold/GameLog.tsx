"use client";

import { useEffect, useRef } from "react";
import type { LogEntry } from "@/engine";

/** Fills its container's height and scrolls itself, keeping the newest entry in view. */
export function GameLog({ log }: { log: LogEntry[] }) {
  const box = useRef<HTMLElement>(null);
  useEffect(() => {
    if (box.current) box.current.scrollTop = box.current.scrollHeight;
  }, [log.length]);

  return (
    <section
      ref={box}
      aria-label="Game log"
      className="flex h-full min-h-0 flex-col overflow-y-auto px-4 py-3 text-xs"
    >
      <h2 className="hud-label mb-2">Colony log</h2>
      <ol className="flex flex-col gap-0.5">
        {log.slice(-200).map((e, i) => (
          <li
            key={i}
            className={e.message.startsWith("Turn ") ? "mt-2 font-semibold text-ink" : "text-dim"}
          >
            {e.message}
          </li>
        ))}
      </ol>
    </section>
  );
}
