import type { NextRequest } from "next/server";
import { GameNotFoundError } from "@/server/games";
import { gameService, getGuestId } from "@/server/guest";

/**
 * Polling endpoint: GET /api/games/<id>?v=<version>.
 * 204 if nothing changed since that version, else the caller's fresh snapshot.
 * A Route Handler rather than a Server Action, because Server Actions run one
 * at a time per client and a poll shouldn't queue behind (or ahead of) a move.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const version = Number(request.nextUrl.searchParams.get("v") ?? -1);
  const guestId = await getGuestId();
  const headers = { "Cache-Control": "no-store" };
  if (!guestId) return Response.json({ error: "Game not found." }, { status: 404, headers });

  try {
    const snapshot = await gameService().poll(id, guestId, version);
    if (!snapshot) return new Response(null, { status: 204, headers });
    return Response.json(snapshot, { headers });
  } catch (e) {
    if (e instanceof GameNotFoundError) {
      return Response.json({ error: e.message }, { status: 404, headers });
    }
    throw e;
  }
}
