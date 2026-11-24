import Link from "next/link";
import { gameService, getGuestId } from "@/server/guest";

/** Games this browser's guest is seated in, newest activity first. */
export async function YourGames() {
  const guestId = await getGuestId();
  if (!guestId) return null;
  const games = await gameService().listGames(guestId);
  if (games.length === 0) return null;

  return (
    <section aria-labelledby="your-games" className="flex flex-col gap-2">
      <h2 id="your-games" className="hud-label">
        Your games
      </h2>
      <ul className="panel flex flex-col divide-y divide-line">
        {games.map((g) => (
          <li key={g.id}>
            <Link
              href={`/game/${g.id}`}
              className="flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-raise"
            >
              <span>{g.opponents.length ? `vs ${g.opponents.join(", ")}` : "Just you so far"}</span>
              <span className="text-xs text-dim">
                {g.status === "finished"
                  ? "Finished"
                  : g.status === "lobby"
                    ? "Waiting for players"
                    : `Turn ${g.turnNumber} · Continue`}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
