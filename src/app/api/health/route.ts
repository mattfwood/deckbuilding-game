import { getPrisma } from "@/server/db";

/** Uptime check: 200 if the app can reach the database, 503 if not. Reveals no details. */
export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  try {
    await getPrisma().$queryRaw`SELECT 1`;
    return Response.json({ ok: true }, { headers });
  } catch (e) {
    console.error("Health check failed", e);
    return Response.json({ ok: false }, { status: 503, headers });
  }
}
