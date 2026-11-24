import { getCard, type CardId, type CardType } from "@/engine";

/**
 * A card's category, shown as a small icon instead of a color, so the accent
 * color only ever means "you can act on this". Hazards and attacks use the
 * danger color; everything else is neutral. Plain actions have no icon.
 */
type Category = "resource" | "victory" | "hazard" | "attack" | "reaction";

const ORDER: [CardType, Category][] = [
  ["curse", "hazard"],
  ["attack", "attack"],
  ["victory", "victory"],
  ["treasure", "resource"],
  ["reaction", "reaction"],
];

export function categoryOf(id: CardId): Category | null {
  const types = getCard(id).types;
  return ORDER.find(([t]) => types.includes(t))?.[1] ?? null;
}

const PATHS: Record<Category, React.ReactNode> = {
  // A cut gem.
  resource: <path d="M8 1.5 14 8l-6 6.5L2 8z" />,
  victory: <path d="m8 1.5 1.9 4 4.4.5-3.3 3 .9 4.4L8 11.2l-3.9 2.2.9-4.4-3.3-3 4.4-.5z" />,
  hazard: (
    <>
      <path d="M8 1.5 15 14H1z" />
      <path d="M8 6v3.5M8 11.5v.5" className="stroke-void" strokeWidth="1.6" fill="none" />
    </>
  ),
  // A lightning bolt.
  attack: <path d="M9.5 1 3 9h4.5L6.5 15 13 7H8.5z" />,
  reaction: <path d="M8 1.5 14 4v4c0 3.5-2.6 5.8-6 6.5C4.6 13.8 2 11.5 2 8V4z" />,
};

const LABELS: Record<Category, string> = {
  resource: "Resource",
  victory: "Victory",
  hazard: "Hazard",
  attack: "Attack",
  reaction: "Reaction",
};

export function CardIcon({ id, className = "size-3.5" }: { id: CardId; className?: string }) {
  const cat = categoryOf(id);
  if (!cat) return null;
  const tone = cat === "hazard" || cat === "attack" ? "text-danger" : "text-dim";
  return (
    <svg
      viewBox="0 0 16 16"
      fill="currentColor"
      role="img"
      aria-label={LABELS[cat]}
      className={`shrink-0 ${tone} ${className}`}
    >
      {PATHS[cat]}
    </svg>
  );
}
