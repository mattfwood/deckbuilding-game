import { getCard, type CardId, type CardType } from "@/engine";

/**
 * Cards are neutral; a thin top stripe marks the category, using only the
 * palette's two colors plus white:
 *   resource = accent, victory = white, hazard/attack = danger, other actions = none.
 */
const STRIPE: Record<CardType, string> = {
  treasure: "bg-accent",
  victory: "bg-ink",
  curse: "bg-danger",
  attack: "bg-danger",
  reaction: "bg-transparent",
  action: "bg-transparent",
};

/** How each type reads on a card. Internal names stay generic; these fit the colony theme. */
const TYPE_LABELS: Record<CardType, string> = {
  treasure: "resource",
  victory: "victory",
  curse: "hazard",
  action: "action",
  attack: "attack",
  reaction: "reaction",
};

/** The type that decides a card's stripe, most specific first. */
function stripeFor(id: CardId): string {
  const types = getCard(id).types;
  const order: CardType[] = ["curse", "attack", "victory", "treasure", "reaction", "action"];
  return STRIPE[order.find((t) => types.includes(t)) ?? "action"];
}

export interface CardProps {
  id: CardId;
  /** Pile size, for supply cards. */
  count?: number;
  size?: "sm" | "md";
  /** Visual state: playable/buyable, chosen in a selection, or a decision option. */
  state?: "idle" | "available" | "reachable" | "selected" | "option";
  dimmed?: boolean;
  /** Also drain the color, for cards that are out of reach. */
  muted?: boolean;
  onClick?: () => void;
  title?: string;
}

/** Accent means "you can act on this"; white marks your own selection. */
const STATE_RING = {
  idle: "",
  available: "ring-2 ring-accent hover:-translate-y-0.5 cursor-pointer",
  reachable:
    "outline-1 outline-dashed outline-offset-2 outline-accent/70 hover:-translate-y-0.5 cursor-pointer",
  selected: "ring-2 ring-ink -translate-y-2",
  option: "ring-1 ring-accent/70 hover:-translate-y-0.5 cursor-pointer",
};

export function Card({
  id,
  count,
  size = "md",
  state = "idle",
  dimmed,
  muted,
  onClick,
  title,
}: CardProps) {
  const card = getCard(id);
  const sizing = size === "sm" ? "w-28 min-h-32 text-[11px]" : "w-32 min-h-36 text-xs";
  const className = [
    "relative flex flex-col rounded-md border border-line bg-raise text-left transition",
    sizing,
    STATE_RING[state],
    dimmed ? "opacity-40" : "",
    muted ? "grayscale" : "",
  ].join(" ");

  const body = (
    <>
      <span aria-hidden className={`h-0.5 rounded-t-md ${stripeFor(id)}`} />
      <div className="flex flex-1 flex-col gap-1 p-2">
        <div className="flex items-start justify-between gap-1">
          <span className="text-[12px] leading-tight font-semibold text-ink">{card.name}</span>
          <span
            className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded border border-line px-1 font-mono text-[11px] text-ink"
            aria-label={`Cost ${card.cost}`}
          >
            {card.cost}
          </span>
        </div>
        <span className="flex items-baseline justify-between gap-1 text-[10px] text-faint">
          <span className="tracking-[0.12em] uppercase">
            {card.types.map((t) => TYPE_LABELS[t]).join(" · ")}
          </span>
          {count !== undefined && <span className="font-mono">×{count}</span>}
        </span>
        <p className="mt-1 leading-snug whitespace-pre-line text-dim">{card.text}</p>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={className}
        onClick={onClick}
        title={title}
        aria-label={`${card.name}${count !== undefined ? `, ${count} left` : ""}`}
        aria-pressed={state === "selected" ? true : undefined}
      >
        {body}
      </button>
    );
  }
  return (
    <div className={className} title={title}>
      {body}
    </div>
  );
}
