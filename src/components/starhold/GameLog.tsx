"use client";

import { useEffect, useRef } from "react";
import type { LogEntry } from "@/engine";

export function GameLog({ log }: { log: LogEntry[] }) {
  const box = useRef<HTMLElement>(null);
  // Keep the newest entry visible without scrolling the page itself.
  useEffect(() => {
    if (box.current) box.current.scrollTop = box.current.scrollHeight;
  }, [log.length]);

  return (
    <section
      ref={box}
      aria-label="Game log"
      className="panel flex max-h-[70vh] flex-col overflow-y-auto p-3 text-xs"
    >
      <h2 className="hud-label mb-2">Colony log</h2>
      <ol className="flex flex-col gap-0.5">
        {log.slice(-200).map((e, i) => (
          <li
            key={i}
            className={
              e.message.startsWith("Turn ")
                ? "mt-2 font-semibold tracking-wide text-ink"
                : "text-dim"
            }
          >
            {e.message}
          </li>
        ))}
      </ol>
    </section>
  );
}
