"use client";

import { useState } from "react";
import {
  getCard,
  hasType,
  type Action,
  type CardId,
  type Decision,
  type PlayerView,
} from "@/engine";
import { Card } from "./Card";
import type { CardViewerTab } from "./CardViewer";
import { Gain } from "./Gain";
import type { TurnFx } from "./turnFx";

interface PlayerAreaProps {
  view: PlayerView;
  /** Send one or more actions; several go to the server as one all-or-nothing batch. */
  act: (...actions: Action[]) => void;
  myTurn: boolean;
  myDecision: Decision | null;
  /** Who we're waiting on, when it isn't us. */
  waitingOn: string | null;
  error: string | null;
  onDismissError: () => void;
  onViewCards: (tab: CardViewerTab) => void;
  /** What your last play gave you, when it's your turn; drives the "+N" feedback. */
  fx: TurnFx | null;
}

/**
 * The tray docked at the bottom of the screen: your stats and controls, any
 * decision you owe, what's in play, and your hand. The parent remounts this
 * (via `key`) when a new decision starts, which resets the card selection.
 */
export function PlayerArea({
  view,
  act,
  myTurn,
  myDecision,
  waitingOn,
  error,
  onDismissError,
  onViewCards,
  fx,
}: PlayerAreaProps) {
  const [selected, setSelected] = useState<number[]>([]);
  const you = view.you;
  const me = view.players[you];
  const handResources = view.hand
    .filter((c) => hasType(c, "treasure"))
    .reduce((sum, c) => sum + (getCard(c).coins ?? 0), 0);

  const selecting = myDecision?.kind === "selectFromHand" ? myDecision : null;
  // Stats belong to whoever's turn it is, even while a decision is pending.
  const isCurrent = view.currentPlayer === you && view.phase !== "gameOver";
  const current = view.players[view.currentPlayer];

  function playable(id: CardId) {
    if (!myTurn) return false;
    if (hasType(id, "action")) return view.phase === "action" && view.actions > 0;
    return hasType(id, "treasure");
  }

  function cardState(index: number) {
    if (selecting) return selected.includes(index) ? "selected" : "playable";
    return playable(view.hand[index]) ? "playable" : "idle";
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
    if (!playable(id)) return;
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

  const playAll = () => act({ type: "playAllTreasures", player: you });
  // The main button is the next sensible step: play your resources, then end the turn.
  const resourcesFirst = view.phase === "action" && handResources > 0;

  return (
    <section
      aria-label="Your area"
      className="flex shrink-0 flex-col gap-2.5 border-t border-line bg-panel px-4 py-3 [@media(max-height:560px)]:max-h-[60dvh] [@media(max-height:560px)]:overflow-y-auto"
    >
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <span className="text-base font-semibold text-ink">{me.name}</span>
        <Stat
          label="Actions"
          value={view.actions}
          active={isCurrent}
          gain={fx?.actions}
          fxId={fx?.id}
        />
        <Stat label="Buys" value={view.buys} active={isCurrent} gain={fx?.buys} fxId={fx?.id} />
        <Stat
          label="Credits"
          value={view.coins}
          active={isCurrent}
          hint={myTurn && handResources > 0 ? `+${handResources} in hand` : undefined}
          gain={fx?.credits}
          fxId={fx?.id}
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
              className="relative rounded-md border border-line px-2 py-0.5 text-xs text-dim hover:bg-raise hover:text-ink"
              onClick={() => onViewCards(tab)}
            >
              {label}
              {/* Drawn cards come off the deck, so that's where "+3 cards" rises from. */}
              {tab === "deck" && fx && fx.cards > 0 && (
                <Gain key={fx.id} text={`+${fx.cards} card${fx.cards === 1 ? "" : "s"}`} />
              )}
            </button>
          ))}
        </span>

        {myTurn && (
          <span className="ml-auto flex gap-2">
            {resourcesFirst ? (
              <>
                <button className="btn-secondary" onClick={endTurn}>
                  End turn
                </button>
                <button className="btn-primary" onClick={playAll}>
                  Play all resources
                </button>
              </>
            ) : (
              <>
                {handResources > 0 && (
                  <button className="btn-secondary" onClick={playAll}>
                    Play all resources
                  </button>
                )}
                <button className="btn-primary" onClick={endTurn}>
                  End turn
                </button>
              </>
            )}
          </span>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-md border border-danger/50 bg-danger/10 px-3 py-2 text-sm text-ink"
        >
          {error}
          <button className="text-xs underline" onClick={onDismissError}>
            Dismiss
          </button>
        </div>
      )}

      <DecisionBar
        view={view}
        act={act}
        decision={myDecision}
        selected={selected}
        waitingOn={waitingOn}
      />

      <InPlay cards={current.inPlay} owner={view.currentPlayer === you ? null : current.name} />

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pt-1.5 pb-1">
        {view.hand.map((id, i) => {
          const state = cardState(i);
          const fresh = fx?.freshHand.indexOf(i) ?? -1;
          return (
            <Card
              key={i}
              id={id}
              state={state}
              fresh={fresh >= 0}
              freshDelay={fresh * 90}
              muted={!selecting && myTurn && state === "idle"}
              onClick={state === "idle" ? undefined : () => onCardClick(i)}
            />
          );
        })}
        {view.hand.length === 0 && <p className="py-6 text-sm text-dim">Your hand is empty.</p>}
      </div>
    </section>
  );
}

/** What the current player has played this turn, as one compact line. */
function InPlay({ cards, owner }: { cards: CardId[]; owner: string | null }) {
  if (cards.length === 0) return null;
  const counts = new Map<CardId, number>();
  for (const id of cards) counts.set(id, (counts.get(id) ?? 0) + 1);
  return (
    <p className="text-xs text-dim">
      <span className="hud-label mr-2">{owner ? `${owner} played` : "In play"}</span>
      {[...counts].map(([id, n]) => `${getCard(id).name}${n > 1 ? ` ×${n}` : ""}`).join(" · ")}
    </p>
  );
}

function Stat({
  label,
  value,
  active,
  hint,
  gain = 0,
  fxId,
}: {
  label: string;
  value: number;
  active: boolean;
  hint?: string;
  /** Rises as "+N" above the number when your last play added to it. */
  gain?: number;
  fxId?: number;
}) {
  return (
    <span className={`flex items-baseline gap-1.5 ${active ? "" : "opacity-50"}`}>
      <span className="hud-label">{label}</span>
      <strong className="relative font-mono text-lg text-ink tabular-nums">
        {active ? value : "–"}
        {gain > 0 && <Gain key={fxId} text={`+${gain}`} />}
      </strong>
      {hint && <span className="text-xs text-dim">{hint}</span>}
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
      <p className="flex items-center gap-2 text-sm text-dim">
        <span aria-hidden className="size-2 animate-pulse rounded-full bg-accent" />
        Waiting for {waitingOn}…
      </p>
    );
  }

  const you = view.you;
  const shell =
    "flex flex-wrap items-center gap-3 rounded-md border border-line border-l-2 border-l-accent bg-raise px-3 py-2 text-sm";

  switch (decision.kind) {
    case "selectFromHand": {
      const ok = selected.length >= decision.min && selected.length <= decision.max;
      return (
        <div className={shell} role="status">
          <strong className="text-ink">{decision.prompt}</strong>
          <span className="text-dim">
            Selected {selected.length}
            {decision.min === decision.max ? ` of ${decision.max}` : ` (up to ${decision.max})`}
          </span>
          <button
            className="btn-primary ml-auto"
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
          <strong className="text-ink">{decision.prompt}</strong>
          <span className="text-dim">
            Choose from the supply above; faded cards aren&apos;t allowed.
          </span>
        </div>
      );
    case "revealReaction":
      return (
        <div className={shell} role="status">
          <strong className="text-ink">{decision.prompt}</strong>
          <span className="ml-auto flex gap-2">
            {[false, true].map((reveal) => (
              <button
                key={String(reveal)}
                className={reveal ? "btn-primary" : "btn-secondary"}
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
          </span>
        </div>
      );
  }
}
