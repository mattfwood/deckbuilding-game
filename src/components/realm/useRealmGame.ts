"use client";

import { useCallback, useEffect, useReducer } from "react";
import {
  EngineError,
  applyAction,
  chooseBotAction,
  createGame,
  getActor,
  type Action,
  type GameState,
} from "@/engine";

const SAVE_KEY = "realm:save:v1";
const BOT_DELAY_MS = 300;
export const BOT_NAMES = ["Ada", "Bram", "Cass"];

export interface Session {
  state: GameState;
  humanSeat: number;
  error: string | null;
}

type Msg =
  | { type: "act"; action: Action }
  | { type: "new"; state: GameState; humanSeat: number }
  | { type: "quit" }
  | { type: "dismissError" };

function reducer(session: Session | null, msg: Msg): Session | null {
  switch (msg.type) {
    case "new":
      return { state: msg.state, humanSeat: msg.humanSeat, error: null };
    case "quit":
      return null;
    case "dismissError":
      return session && { ...session, error: null };
    case "act":
      if (!session) return session;
      try {
        return { ...session, state: applyAction(session.state, msg.action), error: null };
      } catch (e) {
        if (e instanceof EngineError) return { ...session, error: e.message };
        throw e;
      }
  }
}

function loadSaved(): Session | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as { state?: GameState; humanSeat?: number };
    if (!saved.state?.players || typeof saved.humanSeat !== "number") return null;
    return { state: saved.state, humanSeat: saved.humanSeat, error: null };
  } catch {
    return null;
  }
}

/** Local single-player game: one human seat, bots in the rest, saved to localStorage. */
export function useRealmGame() {
  const [session, dispatch] = useReducer(reducer, null, loadSaved);

  // Let bots take their moves, one step at a time so the human can follow along.
  useEffect(() => {
    if (!session) return;
    const actor = getActor(session.state);
    if (actor === null || actor === session.humanSeat) return;
    const timer = setTimeout(
      () => dispatch({ type: "act", action: chooseBotAction(session.state, actor) }),
      BOT_DELAY_MS,
    );
    return () => clearTimeout(timer);
  }, [session]);

  useEffect(() => {
    try {
      if (session) {
        localStorage.setItem(
          SAVE_KEY,
          JSON.stringify({ state: session.state, humanSeat: session.humanSeat }),
        );
      } else {
        localStorage.removeItem(SAVE_KEY);
      }
    } catch {
      // Storage unavailable (private mode, quota): the game still works, it just won't resume.
    }
  }, [session]);

  const act = useCallback((action: Action) => dispatch({ type: "act", action }), []);

  const startGame = useCallback((name: string, botCount: number) => {
    const players = [
      { id: "human", name: name.trim() || "Player" },
      ...BOT_NAMES.slice(0, botCount).map((n, i) => ({ id: `bot-${i}`, name: n })),
    ];
    const state = createGame({ seed: crypto.randomUUID(), players });
    dispatch({ type: "new", state, humanSeat: 0 });
  }, []);

  const quit = useCallback(() => dispatch({ type: "quit" }), []);
  const dismissError = useCallback(() => dispatch({ type: "dismissError" }), []);

  return { session, act, startGame, quit, dismissError };
}
