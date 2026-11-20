"use client";

import {
  getActor,
  getCard,
  getPlayerView,
  hasType,
  type Action,
  type CardId,
  type GameState,
} from "@/engine";
import { Card } from "./Card";
import { GameLog } from "./GameLog";
import { GameOver } from "./GameOver";
import { Opponents } from "./Opponents";
import { PlayerArea } from "./PlayerArea";
import { Supply } from "./Supply";

interface BoardProps {
  state: GameState;
  humanSeat: number;
  error: string | null;
  act: (action: Action) => void;
  onDismissError: () => void;
  onNewGame: () => void;
}

export function Board({ state, humanSeat, error, act, onDismissError, onNewGame }: BoardProps) {
  const view = getPlayerView(state, humanSeat);
  const you = view.you;
  const actor = getActor(state);
  const pending = view.pendingDecision;
  const myDecision = pending?.player === you ? pending : null;
  const myTurn = view.currentPlayer === you && !pending && view.phase !== "gameOver";
  const current = view.players[view.currentPlayer];

  const potentialCoins =
    view.coins +
    view.hand
      .filter((c) => hasType(c, "treasure"))
      .reduce((sum, c) => sum + (getCard(c).coins ?? 0), 0);

  function supplyState(id: CardId) {
    if (myDecision?.kind === "selectFromSupply") {
      return myDecision.options.includes(id) ? "option" : "idle";
    }
    const canBuy =
      myTurn && view.buys > 0 && view.supply[id] > 0 && getCard(id).cost <= potentialCoins;
    return canBuy ? "available" : "idle";
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
    // Buying auto-plays your treasures if you need their coins.
    if (getCard(id).cost > view.coins) act({ type: "playAllTreasures", player: you });
    act({ type: "buy", player: you, cardId: id });
  }

  const waitingOn = actor !== null && actor !== you ? view.players[actor].name : null;
  const turnLabel =
    view.phase === "gameOver"
      ? "Game over"
      : `Turn ${view.turnNumber} · ${view.currentPlayer === you ? "Your turn" : `${current.name}'s turn`} · ${
          view.phase === "action" ? "Action phase" : "Buy phase"
        }`;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row">
      <main className="flex min-w-0 flex-1 flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Realm</h1>
            <p className="text-sm text-stone-600 dark:text-stone-400">{turnLabel}</p>
          </div>
          <button
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100 dark:border-stone-600 dark:hover:bg-stone-800"
            onClick={() => {
              if (view.phase === "gameOver" || confirm("Abandon this game and start a new one?")) {
                onNewGame();
              }
            }}
          >
            New game
          </button>
        </header>

        <Opponents view={view} actor={actor} />

        <Supply view={view} cardState={supplyState} onPick={onPickSupply} />

        <section aria-label="In play" className="flex min-h-16 flex-col gap-2">
          <h2 className="text-sm font-semibold text-stone-600 dark:text-stone-400">
            In play{view.currentPlayer !== you ? ` (${current.name})` : ""}
          </h2>
          <div className="flex flex-wrap gap-2">
            {view.players[view.currentPlayer].inPlay.map((id, i) => (
              <Card key={i} id={id} size="sm" />
            ))}
          </div>
        </section>

        {error && (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 rounded-md border border-rose-400 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:bg-rose-950/40 dark:text-rose-200"
          >
            {error}
            <button className="text-xs underline" onClick={onDismissError}>
              Dismiss
            </button>
          </div>
        )}

        <PlayerArea
          // Remount on each new decision so the card selection resets.
          key={`${view.log.length}-${pending?.kind ?? "none"}`}
          view={view}
          act={act}
          myTurn={myTurn}
          myDecision={myDecision}
          waitingOn={waitingOn}
        />
      </main>

      <aside className="lg:w-72 lg:shrink-0">
        <GameLog log={view.log} />
      </aside>

      {view.result && <GameOver view={view} onNewGame={onNewGame} />}
    </div>
  );
}
