import "server-only";
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { getPrisma } from "./db";
import { createGameService } from "./games";

/**
 * Anonymous identity until Phase 4 adds accounts: a random id in an httpOnly
 * cookie. Whoever holds the cookie owns the seats created with it.
 */
// Named from the game's working title, Realm. Kept so existing players keep their seats.
const COOKIE = "realm-guest";
const ONE_YEAR = 60 * 60 * 24 * 365;

export async function getGuestId(): Promise<string | null> {
  return (await cookies()).get(COOKIE)?.value ?? null;
}

/** Only callable from a Server Action or Route Handler, since it may set a cookie. */
export async function ensureGuestId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(COOKIE)?.value;
  if (existing) return existing;
  const id = randomUUID();
  store.set(COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ONE_YEAR,
    path: "/",
  });
  return id;
}

export function gameService() {
  return createGameService(getPrisma());
}
