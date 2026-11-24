import type { PlayerView } from "@/engine";

/** Opponents as compact chips in the header; the one whose turn it is gets the accent border. */
export function Opponents({ view, actor }: { view: PlayerView; actor: number | null }) {
  return (
    <ul aria-label="Opponents" className="flex flex-wrap gap-2">
      {view.players.map((p, seat) => {
        if (seat === view.you) return null;
        const isCurrent = seat === view.currentPlayer && view.phase !== "gameOver";
        return (
          <li
            key={p.id}
            title={`Hand ${p.handCount} · Deck ${p.deckCount} · Discard ${p.discardCount}`}
            className={`flex items-center gap-2 rounded-md border px-2.5 py-1 text-sm ${
              isCurrent ? "border-accent" : "border-line"
            }`}
          >
            <span className="font-medium text-ink">{p.name}</span>
            <span className="font-mono text-xs text-dim">{p.handCount} in hand</span>
            {actor === seat && <span className="sr-only">(thinking)</span>}
          </li>
        );
      })}
    </ul>
  );
}
