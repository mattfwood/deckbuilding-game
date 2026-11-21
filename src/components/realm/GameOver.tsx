import Link from "next/link";
import type { PlayerView } from "@/engine";

export function GameOver({ view }: { view: PlayerView }) {
  const result = view.result!;
  const youWon = result.winners.includes(view.you);
  const rows = view.players
    .map((p, seat) => ({ seat, name: p.name, score: result.scores[seat], turns: p.turnsTaken }))
    .sort((a, b) => b.score - a.score || a.turns - b.turns);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-over-title"
      className="fixed inset-0 z-10 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-stone-900">
        <h2 id="game-over-title" className="text-xl font-bold">
          {youWon ? (result.winners.length > 1 ? "You shared the win!" : "You win!") : "Game over"}
        </h2>
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="text-left text-stone-500">
              <th className="pb-1 font-medium">Player</th>
              <th className="pb-1 text-right font-medium">VP</th>
              <th className="pb-1 text-right font-medium">Turns</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.seat} className={result.winners.includes(r.seat) ? "font-semibold" : ""}>
                <td className="py-0.5">
                  {r.name}
                  {result.winners.includes(r.seat) && " 👑"}
                </td>
                <td className="py-0.5 text-right tabular-nums">{r.score}</td>
                <td className="py-0.5 text-right tabular-nums">{r.turns}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Link
          href="/"
          className="mt-6 block w-full rounded-md bg-stone-900 px-3 py-2 text-center text-sm font-medium text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900"
        >
          New game
        </Link>
      </div>
    </div>
  );
}
