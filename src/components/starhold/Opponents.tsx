import type { PlayerView } from "@/engine";
import { Gain, gainText } from "./Gain";
import type { TurnFx } from "./turnFx";

/** Opponents as compact chips in the header; the one whose turn it is gets the accent border. */
export function Opponents({
  view,
  actor,
  fx,
}: {
  view: PlayerView;
  actor: number | null;
  fx: TurnFx;
}) {
  return (
    <ul aria-label="Opponents" className="flex flex-wrap gap-2">
      {view.players.map((p, seat) => {
        if (seat === view.you) return null;
        const isCurrent = seat === view.currentPlayer && view.phase !== "gameOver";
        return (
          <li
            key={p.id}
            title={`Hand ${p.handCount} · Deck ${p.deckCount} · Discard ${p.discardCount}`}
            className={`relative flex items-center gap-2 rounded-md border px-2.5 py-1 text-sm ${
              isCurrent ? "border-accent" : "border-line"
            }`}
          >
            <span className="font-medium text-ink">{p.name}</span>
            <span className="font-mono text-xs text-dim">{p.handCount} in hand</span>
            {actor === seat && <span className="sr-only">(thinking)</span>}
            {fx.seat === seat && (
              <Gain
                key={fx.id}
                placement="below"
                text={gainText([
                  [fx.cards, "card", "cards"],
                  [fx.actions, "action", "actions"],
                  [fx.buys, "buy", "buys"],
                  [fx.credits, "credit", "credits"],
                ])}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}
