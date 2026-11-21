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
      <h2 id="your-games" className="text-sm font-semibold text-stone-600 dark:text-stone-400">
        Your games
      </h2>
      <ul className="flex flex-col divide-y divide-stone-200 rounded-md border border-stone-200 dark:divide-stone-700 dark:border-stone-700">
        {games.map((g) => (
          <li key={g.id}>
            <Link
              href={`/game/${g.id}`}
              className="flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              <span>{g.opponents.length ? `vs ${g.opponents.join(", ")}` : "Just you so far"}</span>
              <span className="text-xs text-stone-500">
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
