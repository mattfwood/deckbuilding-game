"use client";

import { useEffect } from "react";
import { getCard, type CardId, type CardType, type PlayerView } from "@/engine";
import { Card } from "./Card";

export type CardViewerTab = "all" | "deck" | "discard";

const TABS: { id: CardViewerTab; label: string }[] = [
  { id: "all", label: "All cards" },
  { id: "deck", label: "Draw pile" },
  { id: "discard", label: "Discard pile" },
];

const TYPE_ORDER: CardType[] = ["action", "treasure", "victory", "curse"];

/** Groups cards into [id, count] pairs: actions, then treasures, victory, curses; pricier first. */
function groupCards(cards: CardId[]): [CardId, number][] {
  const counts = new Map<CardId, number>();
  for (const id of cards) counts.set(id, (counts.get(id) ?? 0) + 1);
  const rank = (id: CardId) => TYPE_ORDER.findIndex((t) => getCard(id).types.includes(t));
  return [...counts].sort(
    ([a], [b]) => rank(a) - rank(b) || getCard(b).cost - getCard(a).cost || a.localeCompare(b),
  );
}

export function cardsFor(view: PlayerView, tab: CardViewerTab): CardId[] {
  const me = view.players[view.you];
  if (tab === "deck") return view.deck;
  if (tab === "discard") return view.discard;
  return [...view.deck, ...view.hand, ...view.discard, ...me.inPlay];
}

interface CardViewerProps {
  view: PlayerView;
  tab: CardViewerTab;
  onTab: (tab: CardViewerTab) => void;
  onClose: () => void;
}

export function CardViewer({ view, tab, onTab, onClose }: CardViewerProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const cards = cardsFor(view, tab);
  const groups = groupCards(cards);
  const vp = cards.reduce((sum, id) => sum + (getCard(id).vp ?? 0), 0);
  const coins = cards.reduce((sum, id) => sum + (getCard(id).coins ?? 0), 0);

  return (
    <div
      className="fixed inset-0 z-20 flex items-end justify-center bg-black/70 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-viewer-title"
        className="flex max-h-[85vh] w-full max-w-3xl flex-col gap-4 rounded-t-xl border border-line bg-panel p-4 sm:rounded-xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="card-viewer-title" className="text-lg font-semibold text-ink">
            Your cards
          </h2>
          <button
            className="rounded-md px-2 py-1 text-sm text-dim hover:bg-raise"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div role="tablist" className="flex gap-1 border-b border-line">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              className={`-mb-px border-b-2 px-3 py-1.5 text-sm font-medium ${
                tab === t.id
                  ? "border-accent text-ink"
                  : "border-transparent text-dim hover:text-ink"
              }`}
              onClick={() => onTab(t.id)}
            >
              {t.label} <span className="tabular-nums">({cardsFor(view, t.id).length})</span>
            </button>
          ))}
        </div>

        <p className="text-sm text-dim">
          {cards.length} card{cards.length === 1 ? "" : "s"} · {coins} credits in resources · {vp}{" "}
          VP
          {tab === "deck" && " · shown sorted, not in draw order"}
          {tab === "all" && " · includes your hand and cards in play"}
        </p>

        <div className="flex flex-wrap gap-4 overflow-y-auto pb-3 pr-3">
          {groups.map(([id, count]) => (
            <Card key={id} id={id} size="sm" count={count} />
          ))}
          {groups.length === 0 && <p className="text-sm text-dim">Empty.</p>}
        </div>
      </div>
    </div>
  );
}
