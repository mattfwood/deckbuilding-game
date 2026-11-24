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
            className={`panel min-w-48 px-3 py-2 text-sm ${
              isCurrent ? "border-cyan-300/60 shadow-[0_0_16px_rgb(34_211_238/0.25)]" : ""
            }`}
          >
            <div className="flex items-center justify-between gap-2 font-hud font-semibold tracking-wide">
              <span>{p.name}</span>
              {actor === seat && (
                <span className="animate-pulse font-sans text-xs font-normal text-cyan-300">
                  thinking…
                </span>
              )}
            </div>
            <div className="font-mono text-xs text-dim">
              Hand {p.handCount} · Deck {p.deckCount} · Discard {p.discardCount}
            </div>
            {p.inPlay.length > 0 && (
              <div className="mt-1 text-xs text-slate-300">In play: {cardNames(p.inPlay)}</div>
            )}
          </div>
        );
      })}
    </section>
  );
}
