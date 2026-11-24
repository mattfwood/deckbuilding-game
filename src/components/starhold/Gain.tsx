/**
 * A "+N" that rises from whatever it sits on and fades. Place it inside a
 * `relative` element and give it `key={fx.id}` so it replays on every gain.
 * Decorative: Board announces gains to screen readers separately.
 */
// Centred with a plain `translate` rather than Tailwind's -translate-x-1/2,
// whose variables didn't resolve here and left the label hanging off to the right.
const PLACEMENT = {
  above: "-top-6 left-1/2 [translate:-50%_0]",
  below: "-bottom-7 left-1/2 [translate:-50%_0]",
};

export function Gain({
  text,
  placement = "above",
}: {
  text: string | null;
  placement?: keyof typeof PLACEMENT;
}) {
  if (!text) return null;
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute z-10 rounded bg-void px-1.5 py-0.5 font-mono text-xs font-semibold whitespace-nowrap text-accent ring-1 ring-accent/40 motion-safe:animate-gain motion-reduce:animate-gain-still ${PLACEMENT[placement]}`}
    >
      {text}
    </span>
  );
}

/** "+3 cards · +1 action", leaving out zeros; null when there's nothing. */
export function gainText(parts: [number, string, string][]): string | null {
  const shown = parts
    .filter(([n]) => n > 0)
    .map(([n, one, many]) => `+${n} ${n === 1 ? one : many}`);
  return shown.length ? shown.join(" · ") : null;
}
