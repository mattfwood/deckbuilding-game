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
      className="fixed inset-0 z-20 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-viewer-title"
        className="flex max-h-[85vh] w-full max-w-3xl flex-col gap-4 rounded-t-xl bg-white p-4 shadow-xl sm:rounded-xl sm:p-6 dark:bg-stone-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="card-viewer-title" className="text-lg font-bold">
            Your cards
          </h2>
          <button
            className="rounded-md px-2 py-1 text-sm text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div role="tablist" className="flex gap-1 border-b border-stone-200 dark:border-stone-700">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              className={`-mb-px border-b-2 px-3 py-1.5 text-sm ${
                tab === t.id
                  ? "border-stone-900 font-semibold dark:border-stone-100"
                  : "border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
              }`}
              onClick={() => onTab(t.id)}
            >
              {t.label} <span className="tabular-nums">({cardsFor(view, t.id).length})</span>
            </button>
          ))}
        </div>

        <p className="text-sm text-stone-600 dark:text-stone-400">
          {cards.length} card{cards.length === 1 ? "" : "s"} · {coins} coins in treasure · {vp} VP
          {tab === "deck" && " · shown sorted, not in draw order"}
          {tab === "all" && " · includes your hand and cards in play"}
        </p>

        <div className="flex flex-wrap gap-4 overflow-y-auto pb-3 pr-3">
          {groups.map(([id, count]) => (
            <Card key={id} id={id} size="sm" count={count} />
          ))}
          {groups.length === 0 && <p className="text-sm text-stone-500">Empty.</p>}
        </div>
      </div>
    </div>
  );
}
