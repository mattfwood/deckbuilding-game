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

/** Start a game against bots right away. */
export async function createGameAction(input: {
  name: string;
  botCount: number;
}): Promise<{ error: string }> {
  const guestId = await ensureGuestId();
  const gameId = await orError(() =>
    gameService().createGame({
      guestId,
      name: String(input?.name ?? ""),
      botCount: Number(input?.botCount),
    }),
  );
  if (typeof gameId !== "string") return gameId;
  redirect(`/game/${gameId}`);
}

/** Open a lobby to invite friends into. */
export async function createLobbyAction(input: { name: string }): Promise<{ error: string }> {
  const guestId = await ensureGuestId();
  const gameId = await orError(() =>
    gameService().createLobby({ guestId, name: String(input?.name ?? "") }),
  );
  if (typeof gameId !== "string") return gameId;
  redirect(`/game/${gameId}`);
}

export async function joinGameAction(input: {
  code: string;
  name: string;
}): Promise<{ error: string }> {
  const guestId = await ensureGuestId();
  const gameId = await orError(() =>
    gameService().joinLobby(String(input?.code ?? ""), guestId, String(input?.name ?? "")),
  );
  if (typeof gameId !== "string") return gameId;
  redirect(`/game/${gameId}`);
}

export async function actAction(gameId: string, actions: unknown): Promise<GameResult> {
  return run(gameId, (svc, guestId) => svc.act(gameId, guestId, actions));
}

export async function stepBotAction(gameId: string): Promise<GameResult> {
  return run(gameId, (svc, guestId) => svc.stepBot(gameId, guestId));
}

export async function addBotAction(gameId: string): Promise<GameResult> {
  return run(gameId, (svc, guestId) => svc.addBot(gameId, guestId));
}

export async function removeSeatAction(gameId: string, seat: number): Promise<GameResult> {
  return run(gameId, async (svc, guestId) => {
    await svc.removeSeat(gameId, guestId, Number(seat));
    return svc.getSnapshot(gameId, guestId);
  });
}

export async function startGameAction(gameId: string): Promise<GameResult> {
  return run(gameId, (svc, guestId) => svc.startGame(gameId, guestId));
}

/** Leave a lobby you joined (not the host), then go home. */
export async function leaveLobbyAction(gameId: string, seat: number): Promise<{ error: string }> {
  const guestId = await getGuestId();
  if (!guestId || typeof gameId !== "string") return { error: "Game not found." };
  const result = await orError(() => gameService().removeSeat(gameId, guestId, Number(seat)));
  if (result) return result;
  redirect("/");
}

/** The host abandons a lobby, then goes home. */
export async function cancelLobbyAction(gameId: string): Promise<{ error: string }> {
  const guestId = await getGuestId();
  if (!guestId || typeof gameId !== "string") return { error: "Game not found." };
  const result = await orError(() => gameService().cancelLobby(gameId, guestId));
  if (result) return result;
  redirect("/");
}

/** Run `fn`, turning expected failures into `{ error }`. */
async function orError<T>(fn: () => Promise<T>): Promise<T | { error: string }> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof EngineError || e instanceof GameNotFoundError) return { error: e.message };
    throw e;
  }
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
