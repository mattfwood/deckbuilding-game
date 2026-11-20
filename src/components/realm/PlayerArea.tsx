"use client";

import { useState } from "react";
import { getCard, hasType, type Action, type Decision, type PlayerView } from "@/engine";
import { Card } from "./Card";
import type { CardViewerTab } from "./CardViewer";

interface PlayerAreaProps {
  view: PlayerView;
  act: (action: Action) => void;
  myTurn: boolean;
  myDecision: Decision | null;
  /** Who we're waiting on, when it isn't us. */
  waitingOn: string | null;
  onViewCards: (tab: CardViewerTab) => void;
}

const button =
  "rounded-md px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40";
const primary = `${button} bg-stone-900 text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300`;
const secondary = `${button} border border-stone-300 hover:bg-stone-100 dark:border-stone-600 dark:hover:bg-stone-800`;

/**
 * Your hand, status, and controls. The parent remounts this (via `key`) when a
 * new decision starts, which resets the card selection.
 */
export function PlayerArea({
  view,
  act,
  myTurn,
  myDecision,
  waitingOn,
  onViewCards,
}: PlayerAreaProps) {
  const [selected, setSelected] = useState<number[]>([]);
  const you = view.you;
  const me = view.players[you];
  const handTreasure = view.hand
    .filter((c) => hasType(c, "treasure"))
    .reduce((sum, c) => sum + (getCard(c).coins ?? 0), 0);

  const selecting = myDecision?.kind === "selectFromHand" ? myDecision : null;
  // Stats belong to whoever's turn it is, even while a decision is pending.
  const isCurrent = view.currentPlayer === you && view.phase !== "gameOver";

  function cardState(index: number) {
    const id = view.hand[index];
    if (selecting) return selected.includes(index) ? "selected" : "option";
    if (!myTurn) return "idle";
    if (hasType(id, "action") && view.phase === "action" && view.actions > 0) return "available";
    if (hasType(id, "treasure")) return "available";
    return "idle";
  }

  function onCardClick(index: number) {
    const id = view.hand[index];
    if (selecting) {
      setSelected((cur) =>
        cur.includes(index)
          ? cur.filter((i) => i !== index)
          : cur.length < selecting.max
            ? [...cur, index]
            : cur,
      );
      return;
    }
    if (cardState(index) !== "available") return;
    act(
      hasType(id, "action") && view.phase === "action"
        ? { type: "playAction", player: you, cardId: id }
        : { type: "playTreasure", player: you, cardId: id },
    );
  }

  function endTurn() {
    if (view.phase === "action") act({ type: "endPhase", player: you });
    act({ type: "endPhase", player: you });
  }

  return (
    <section aria-label="Your area" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <span className="font-semibold">{me.name}</span>
        <Stat label="Actions" value={view.actions} active={isCurrent} />
        <Stat label="Buys" value={view.buys} active={isCurrent} />
        <Stat
          label="Coins"
          value={view.coins}
          active={isCurrent}
          hint={myTurn && handTreasure > 0 ? `+${handTreasure} in hand` : undefined}
        />
        <span className="flex gap-1">
          {(
            [
              ["deck", `Deck ${me.deckCount}`],
              ["discard", `Discard ${me.discardCount}`],
              ["all", "All cards"],
            ] as const
          ).map(([tab, label]) => (
            <button
              key={tab}
              className="rounded-md border border-stone-300 px-2 py-0.5 text-xs text-stone-600 hover:bg-stone-100 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-800"
              onClick={() => onViewCards(tab)}
            >
              {label}
            </button>
          ))}
        </span>
      </div>

      <DecisionBar
        view={view}
        act={act}
        decision={myDecision}
        selected={selected}
        waitingOn={waitingOn}
      />

      {myTurn && (
        <div className="flex flex-wrap gap-2">
          {view.phase === "action" && (
            <button className={secondary} onClick={() => act({ type: "endPhase", player: you })}>
              End actions
            </button>
          )}
          <button
            className={secondary}
            disabled={handTreasure === 0}
            onClick={() => act({ type: "playAllTreasures", player: you })}
          >
            Play all treasures
          </button>
          <button className={primary} onClick={endTurn}>
            End turn
          </button>
          <span className="self-center text-xs text-stone-500 dark:text-stone-400">
            {view.phase === "action"
              ? "Play actions from your hand, or buy from the supply."
              : "Buy from the supply, then end your turn."}
          </span>
        </div>
      )}

      <div className="flex min-h-48 flex-wrap gap-3 pt-2">
        {view.hand.map((id, i) => {
          const state = cardState(i);
          return (
            <Card
              key={i}
              id={id}
              state={state}
              onClick={state === "idle" ? undefined : () => onCardClick(i)}
            />
          );
        })}
        {view.hand.length === 0 && (
          <p className="self-center text-sm text-stone-500">Your hand is empty.</p>
        )}
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  active,
  hint,
}: {
  label: string;
  value: number;
  active: boolean;
  hint?: string;
}) {
  return (
    <span className={active ? "" : "text-stone-400"}>
      {label} <strong className="tabular-nums">{active ? value : "–"}</strong>
      {hint && <span className="ml-1 text-xs text-stone-500">({hint})</span>}
    </span>
  );
}

function DecisionBar({
  view,
  act,
  decision,
  selected,
  waitingOn,
}: {
  view: PlayerView;
  act: (action: Action) => void;
  decision: Decision | null;
  selected: number[];
  waitingOn: string | null;
}) {
  if (!decision) {
    if (!waitingOn) return null;
    return (
      <p className="rounded-md bg-stone-100 px-3 py-2 text-sm text-stone-600 dark:bg-stone-800 dark:text-stone-300">
        Waiting for {waitingOn}…
      </p>
    );
  }

  const you = view.you;
  const shell =
    "flex flex-wrap items-center gap-3 rounded-md border border-sky-400 bg-sky-50 px-3 py-2 text-sm dark:bg-sky-950/40";

  switch (decision.kind) {
    case "selectFromHand": {
      const ok = selected.length >= decision.min && selected.length <= decision.max;
      return (
        <div className={shell} role="status">
          <strong>{decision.prompt}</strong>
          <span className="text-stone-600 dark:text-stone-300">
            Selected {selected.length}
            {decision.min === decision.max ? ` of ${decision.max}` : ` (up to ${decision.max})`}
          </span>
          <button
            className={primary}
            disabled={!ok}
            onClick={() =>
              act({
                type: "resolveDecision",
                player: you,
                response: { kind: "selectFromHand", cards: selected.map((i) => view.hand[i]) },
              })
            }
          >
            Confirm
          </button>
        </div>
      );
    }
    case "selectFromSupply":
      return (
        <div className={shell} role="status">
          <strong>{decision.prompt}</strong>
          <span className="text-stone-600 dark:text-stone-300">
            Pick a highlighted card in the supply.
          </span>
        </div>
      );
    case "revealReaction":
      return (
        <div className={shell} role="status">
          <strong>{decision.prompt}</strong>
          {[true, false].map((reveal) => (
            <button
              key={String(reveal)}
              className={reveal ? primary : secondary}
              onClick={() =>
                act({
                  type: "resolveDecision",
                  player: you,
                  response: { kind: "revealReaction", reveal },
                })
              }
            >
              {reveal ? "Reveal" : "Don't reveal"}
            </button>
          ))}
        </div>
      );
  }
}
