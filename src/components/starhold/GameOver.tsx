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
      className="fixed inset-0 z-10 flex items-center justify-center bg-black/70 p-4 backdrop-blur-[2px]"
    >
      <div className="panel w-full max-w-sm border-cyan-300/40 bg-hull/95 p-6 shadow-[0_0_40px_rgb(34_211_238/0.2)]">
        <h2
          id="game-over-title"
          className="font-hud text-xl font-bold tracking-wide text-cyan-50 uppercase"
        >
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
                className={
                  result.winners.includes(r.seat)
                    ? "font-semibold text-amber-200"
                    : "text-slate-300"
                }
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
