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
            className={`panel min-w-48 px-3 py-2 text-sm ${isCurrent ? "border-accent" : ""}`}
          >
            <div className="flex items-center justify-between gap-2 font-semibold tracking-wide">
              <span>{p.name}</span>
              {actor === seat && (
                <span className="animate-pulse font-sans text-xs font-normal text-accent">
                  thinking…
                </span>
              )}
            </div>
            <div className="font-mono text-xs text-dim">
              Hand {p.handCount} · Deck {p.deckCount} · Discard {p.discardCount}
            </div>
            {p.inPlay.length > 0 && (
              <div className="mt-1 text-xs text-ink">In play: {cardNames(p.inPlay)}</div>
            )}
          </div>
        );
      })}
    </section>
  );
}
