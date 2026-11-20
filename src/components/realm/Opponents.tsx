import { cardNames, type PlayerView } from "@/engine";

export function Opponents({ view, actor }: { view: PlayerView; actor: number | null }) {
  return (
    <section aria-label="Opponents" className="flex flex-wrap gap-3">
      {view.players.map((p, seat) => {
        if (seat === view.you) return null;
        const isCurrent = seat === view.currentPlayer && view.phase !== "gameOver";
        return (
          <div
            key={p.id}
            className={`min-w-48 rounded-lg border px-3 py-2 text-sm ${
              isCurrent
                ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30"
                : "border-stone-200 dark:border-stone-700"
            }`}
          >
            <div className="flex items-center justify-between gap-2 font-semibold">
              <span>{p.name}</span>
              {actor === seat && (
                <span className="animate-pulse text-xs font-normal text-amber-700 dark:text-amber-400">
                  thinking…
                </span>
              )}
            </div>
            <div className="text-xs text-stone-600 dark:text-stone-400">
              Hand {p.handCount} · Deck {p.deckCount} · Discard {p.discardCount}
            </div>
            {p.inPlay.length > 0 && (
              <div className="mt-1 text-xs text-stone-700 dark:text-stone-300">
                In play: {cardNames(p.inPlay)}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
