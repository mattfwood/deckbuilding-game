"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCard, hasType, type Action, type CardId, type PlayerView } from "@/engine";
import { CardViewer, type CardViewerTab } from "./CardViewer";
import { GameLog } from "./GameLog";
import { GameOver } from "./GameOver";
import { Opponents } from "./Opponents";
import { PlayerArea } from "./PlayerArea";
import { Supply, type SupplyDisplay } from "./Supply";
import { Wordmark } from "./Wordmark";
import { gainText } from "./Gain";
import { diffTurn, noFx, type TurnFx } from "./turnFx";

interface BoardProps {
  /** What the server lets this player see. */
  view: PlayerView;
  error: string | null;
  /** Send one or more actions; several go to the server as one all-or-nothing batch. */
  act: (...actions: Action[]) => void;
  onDismissError: () => void;
}

/**
 * One screen, no page scroll: a header bar with whose turn it is, the supply
 * (which scrolls on its own if it must), the log in a side column, and your
 * hand docked at the bottom so playing and buying never need a scroll.
 */
export function Board({ view, error, act, onDismissError }: BoardProps) {
  // Lives here, not in PlayerArea, because PlayerArea remounts on every new log entry.
  const [viewerTab, setViewerTab] = useState<CardViewerTab | null>(null);
  const [logOpen, setLogOpen] = useState(false);

  // What the last update gave the current player, for the "+2 actions" feedback.
  // Derived while rendering from the previous view (React's "store information
  // from previous renders" pattern), so it's ready on the same frame as the change.
  const [prevView, setPrevView] = useState(view);
  const [fx, setFx] = useState<TurnFx>(() => noFx(0));
  if (view !== prevView) {
    setPrevView(view);
    setFx(diffTurn(prevView, view, fx.id + 1));
  }
  useEffect(() => {
    if (!logOpen) return;
    const close = (e: KeyboardEvent) => e.key === "Escape" && setLogOpen(false);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [logOpen]);
  const you = view.you;
  const actor = view.actor;
  const pending = view.pendingDecision;
  const myDecision = pending?.player === you ? pending : null;
  const myTurn = view.currentPlayer === you && !pending && view.phase !== "gameOver";

  const potentialCoins =
    view.coins +
    view.hand
      .filter((c) => hasType(c, "treasure"))
      .reduce((sum, c) => sum + (getCard(c).coins ?? 0), 0);

  /**
   * Nothing is highlighted: what you can buy (now, or by playing your
   * resources) is clickable; what you can't is faded once you're buying.
   */
  function supplyDisplay(id: CardId): SupplyDisplay {
    if (myDecision?.kind === "selectFromSupply") {
      const isOption = myDecision.options.includes(id);
      return { clickable: isOption, muted: !isOption };
    }
    if (!myTurn) return { clickable: false, muted: false };
    const canBuy =
      view.buys > 0 && (view.supply[id] ?? 0) > 0 && getCard(id).cost <= potentialCoins;
    return { clickable: canBuy, muted: !canBuy && view.phase === "buy" };
  }

  function onPickSupply(id: CardId) {
    if (myDecision?.kind === "selectFromSupply") {
      act({
        type: "resolveDecision",
        player: you,
        response: { kind: "selectFromSupply", cardId: id },
      });
      return;
    }
    // Buying auto-plays your resources if you need their credits.
    const buy: Action = { type: "buy", player: you, cardId: id };
    if (getCard(id).cost > view.coins) act({ type: "playAllTreasures", player: you }, buy);
    else act(buy);
  }

  const waitingOn = actor !== null && actor !== you ? view.players[actor].name : null;

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-4 py-2.5">
        <Link href="/" aria-label="All games" className="hover:opacity-80">
          <Wordmark size="sm" />
        </Link>
        <TurnStatus view={view} waitingOn={waitingOn} />
        <Opponents view={view} actor={actor} fx={fx} />
        <span className="ml-auto flex gap-2">
          <button className="btn-secondary lg:hidden" onClick={() => setLogOpen(true)}>
            Log
          </button>
          <Link href="/" className="btn-secondary">
            All games
          </Link>
        </span>
      </header>

      <div className="flex min-h-0 flex-1">
        <main className="min-w-0 flex-1 overflow-y-auto px-4 py-4">
          <Supply view={view} display={supplyDisplay} onPick={onPickSupply} />
        </main>
        <aside className="hidden w-72 shrink-0 border-l border-line lg:block">
          <GameLog log={view.log} />
        </aside>
      </div>

      <PlayerArea
        // Remount on each new decision so the card selection resets.
        key={`${view.log.length}-${pending?.kind ?? "none"}`}
        view={view}
        act={act}
        myTurn={myTurn}
        myDecision={myDecision}
        waitingOn={waitingOn}
        error={error}
        onDismissError={onDismissError}
        onViewCards={setViewerTab}
        fx={fx.seat === you ? fx : null}
      />

      <p aria-live="polite" className="sr-only">
        {announce(view, fx)}
      </p>

      {logOpen && (
        <div
          className="fixed inset-0 z-20 flex justify-end bg-black/60 lg:hidden"
          onClick={() => setLogOpen(false)}
        >
          <div
            role="dialog"
            aria-label="Colony log"
            className="flex h-full w-80 max-w-[85vw] flex-col border-l border-line bg-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="self-end px-4 py-2 text-sm text-dim hover:text-ink"
              onClick={() => setLogOpen(false)}
            >
              Close
            </button>
            <GameLog log={view.log} />
          </div>
        </div>
      )}

      {viewerTab && (
        <CardViewer
          view={view}
          tab={viewerTab}
          onTab={setViewerTab}
          onClose={() => setViewerTab(null)}
        />
      )}

      {view.result && <GameOver view={view} />}
    </div>
  );
}

/** Whose turn it is, as the most visible thing in the header. */
function TurnStatus({ view, waitingOn }: { view: PlayerView; waitingOn: string | null }) {
  if (view.phase === "gameOver") {
    return <span className="text-sm font-semibold text-ink">Game over</span>;
  }
  const phase = view.phase === "action" ? "Action phase" : "Buy phase";
  const mine = view.currentPlayer === view.you;
  // A decision you owe on someone else's turn (e.g. reacting to an attack) is also your move.
  const yourMove = view.actor === view.you;
  return (
    <span className="flex items-center gap-2 text-sm">
      {yourMove ? (
        <span className="rounded-full bg-accent px-3 py-1 font-semibold text-void">
          {mine ? `Your turn · ${phase}` : "Your move"}
        </span>
      ) : (
        <span className="flex items-center gap-2 rounded-full border border-line px-3 py-1 text-ink">
          <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-accent" />
          {waitingOn ? `${waitingOn}'s move` : `${view.players[view.currentPlayer].name}'s turn`}
        </span>
      )}
      <span className="font-mono text-xs text-dim">Turn {view.turnNumber}</span>
    </span>
  );
}

/** A sentence for screen readers, e.g. "Ada: +3 cards · +1 action". */
function announce(view: PlayerView, fx: TurnFx): string {
  if (fx.seat === null) return "";
  const text = gainText([
    [fx.cards, "card", "cards"],
    [fx.actions, "action", "actions"],
    [fx.buys, "buy", "buys"],
    [fx.credits, "credit", "credits"],
  ]);
  if (!text) return "";
  return `${fx.seat === view.you ? "You" : view.players[fx.seat].name}: ${text}`;
}
