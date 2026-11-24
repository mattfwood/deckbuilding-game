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
      className="fixed inset-0 z-10 flex items-center justify-center bg-black/70 p-4"
    >
      <div className="panel w-full max-w-sm border-line bg-panel p-6">
        <h2 id="game-over-title" className="text-xl font-semibold text-ink">
          {youWon ? (result.winners.length > 1 ? "You shared the win!" : "You win!") : "Game over"}
        </h2>
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="hud-label text-left">
              <th className="pb-1 font-medium">Player</th>
              <th className="pb-1 text-right font-medium">VP</th>
              <th className="pb-1 text-right font-medium">Turns</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.seat}
                className={result.winners.includes(r.seat) ? "font-semibold text-ink" : "text-ink"}
              >
                <td className="py-0.5">
                  {r.name}
                  {result.winners.includes(r.seat) && " ★"}
                </td>
                <td className="py-0.5 text-right font-mono tabular-nums">{r.score}</td>
                <td className="py-0.5 text-right font-mono tabular-nums">{r.turns}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Link href="/" className="btn-primary mt-6 w-full">
          New game
        </Link>
      </div>
    </div>
  );
}
