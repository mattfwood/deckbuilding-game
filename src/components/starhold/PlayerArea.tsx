"use client";

import { useState } from "react";
import { getCard, hasType, type Action, type Decision, type PlayerView } from "@/engine";
import { Card } from "./Card";
import type { CardViewerTab } from "./CardViewer";

interface PlayerAreaProps {
  view: PlayerView;
  /** Send one or more actions; several go to the server as one all-or-nothing batch. */
  act: (...actions: Action[]) => void;
  myTurn: boolean;
  myDecision: Decision | null;
  /** Who we're waiting on, when it isn't us. */
  waitingOn: string | null;
  onViewCards: (tab: CardViewerTab) => void;
}

const primary = "btn-primary";
const secondary = "btn-secondary";

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
    const end: Action = { type: "endPhase", player: you };
    // From the action phase, ending the turn means ending both phases.
    if (view.phase === "action") act(end, end);
    else act(end);
  }

  return (
    <section aria-label="Your area" className="panel flex flex-col gap-3 p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <span className="font-hud text-base font-bold tracking-wide text-cyan-100">{me.name}</span>
        <Stat label="Actions" value={view.actions} active={isCurrent} />
        <Stat label="Buys" value={view.buys} active={isCurrent} />
        <Stat
          label="Credits"
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
              className="rounded-sm border border-cyan-300/25 px-2 py-0.5 font-hud text-xs font-semibold tracking-wide text-cyan-100/90 uppercase hover:border-cyan-300/60 hover:bg-slate-800/80"
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
            Play all resources
          </button>
          <button className={primary} onClick={endTurn}>
            End turn
          </button>
          <span className="self-center text-xs text-dim">
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
          <p className="self-center text-sm text-dim">Your hand is empty.</p>
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
    <span className={`flex items-baseline gap-1.5 ${active ? "" : "opacity-50"}`}>
      <span className="hud-label">{label}</span>
      <strong className="font-mono text-lg text-ink tabular-nums">{active ? value : "–"}</strong>
      {hint && <span className="text-xs text-dim">({hint})</span>}
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
  act: (...actions: Action[]) => void;
  decision: Decision | null;
  selected: number[];
  waitingOn: string | null;
}) {
  if (!decision) {
    if (!waitingOn) return null;
    return (
      <p className="flex items-center gap-2 rounded-md border border-cyan-300/15 bg-slate-950/60 px-3 py-2 text-sm text-dim">
        <span aria-hidden className="size-2 animate-pulse rounded-full bg-signal" />
        Waiting for {waitingOn}…
      </p>
    );
  }

  const you = view.you;
  const shell =
    "flex flex-wrap items-center gap-3 rounded-md border border-violet-400/60 bg-violet-950/60 px-3 py-2 text-sm text-violet-100 shadow-[0_0_16px_rgb(167_139_250/0.2)]";

  switch (decision.kind) {
    case "selectFromHand": {
      const ok = selected.length >= decision.min && selected.length <= decision.max;
      return (
        <div className={shell} role="status">
          <strong>{decision.prompt}</strong>
          <span className="text-violet-200/80">
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
          <span className="text-violet-200/80">Pick a highlighted card in the supply.</span>
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
