"use server";

import { redirect } from "next/navigation";
import { EngineError } from "@/engine";
import {
  ConflictError,
  GameNotFoundError,
  type GameService,
  type GameSnapshot,
} from "@/server/games";
import { ensureGuestId, gameService, getGuestId } from "@/server/guest";

export type GameResult =
  | { ok: true; snapshot: GameSnapshot }
  /** `snapshot` is the latest state when there is one, so the client can resync. */
  | { ok: false; error: string; snapshot: GameSnapshot | null };

export async function createGameAction(input: {
  name: string;
  botCount: number;
}): Promise<{ error: string }> {
  const guestId = await ensureGuestId();
  let gameId: string;
  try {
    gameId = await gameService().createGame({
      guestId,
      name: String(input?.name ?? ""),
      botCount: Number(input?.botCount),
    });
  } catch (e) {
    if (e instanceof EngineError) return { error: e.message };
    throw e;
  }
  redirect(`/game/${gameId}`);
}

export async function actAction(gameId: string, actions: unknown): Promise<GameResult> {
  return run(gameId, (svc, guestId) => svc.act(gameId, guestId, actions));
}

export async function stepBotAction(gameId: string): Promise<GameResult> {
  return run(gameId, (svc, guestId) => svc.stepBot(gameId, guestId));
}

async function run(
  gameId: unknown,
  fn: (svc: GameService, guestId: string) => Promise<GameSnapshot>,
): Promise<GameResult> {
  const guestId = await getGuestId();
  if (typeof gameId !== "string" || !guestId) {
    return { ok: false, error: "Game not found.", snapshot: null };
  }
  const svc = gameService();
  try {
    return { ok: true, snapshot: await fn(svc, guestId) };
  } catch (e) {
    if (e instanceof GameNotFoundError) return { ok: false, error: e.message, snapshot: null };
    if (e instanceof EngineError || e instanceof ConflictError) {
      const snapshot = await svc.getSnapshot(gameId, guestId).catch(() => null);
      return { ok: false, error: e.message, snapshot };
    }
    throw e;
  }
}
