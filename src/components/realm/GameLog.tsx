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
      className="flex max-h-[70vh] flex-col overflow-y-auto rounded-lg border border-stone-200 p-3 text-xs dark:border-stone-700"
    >
      <h2 className="mb-2 text-sm font-semibold">Log</h2>
      <ol className="flex flex-col gap-0.5">
        {log.slice(-200).map((e, i) => (
          <li
            key={i}
            className={
              e.message.startsWith("Turn ")
                ? "mt-2 font-semibold text-stone-900 dark:text-stone-100"
                : "text-stone-600 dark:text-stone-400"
            }
          >
            {e.message}
          </li>
        ))}
      </ol>
    </section>
  );
}
