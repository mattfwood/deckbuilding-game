import { getCard, type CardId, type CardType } from "@/engine";
import { CardIcon } from "./CardIcon";

/** How each type reads on a card. Internal names stay generic; these fit the colony theme. */
const TYPE_LABELS: Record<CardType, string> = {
  treasure: "resource",
  victory: "victory",
  curse: "hazard",
  action: "action",
  attack: "attack",
  reaction: "reaction",
};

export interface CardProps {
  id: CardId;
  /** How many copies, e.g. in the card viewer. */
  count?: number;
  size?: "sm" | "md";
  /**
   * idle: just shown. playable: you can click it (no standing highlight, only
   * on hover, so a hand full of playable cards stays calm). selected: chosen in
   * a hand selection.
   */
  state?: "idle" | "playable" | "selected";
  /** Faded: can't be used right now. */
  muted?: boolean;
  /** Just drawn: slides in with a brief accent outline, after `freshDelay` ms. */
  fresh?: boolean;
  freshDelay?: number;
  onClick?: () => void;
  title?: string;
}

const STATE_STYLE = {
  idle: "",
  playable: "cursor-pointer hover:-translate-y-1 hover:border-accent",
  selected: "-translate-y-1.5 border-ink ring-1 ring-ink",
};

export function Card({
  id,
  count,
  size = "md",
  state = "idle",
  muted,
  fresh,
  freshDelay = 0,
  onClick,
  title,
}: CardProps) {
  const card = getCard(id);
  const sizing = size === "sm" ? "w-28 min-h-28 text-[11px]" : "w-32 min-h-32 text-xs";
  const className = [
    "relative flex shrink-0 flex-col gap-1 rounded-md border border-line bg-raise p-2 text-left transition",
    sizing,
    STATE_STYLE[state],
    muted ? "opacity-40" : "",
    fresh ? "motion-safe:animate-draw-in" : "",
  ].join(" ");
  const style = fresh ? { animationDelay: `${freshDelay}ms` } : undefined;

  const body = (
    <>
      <div className="flex items-start justify-between gap-1.5">
        <span className="text-[13px] leading-tight font-semibold text-ink">{card.name}</span>
        <Cost value={card.cost} />
      </div>
      <span className="flex items-center gap-1 text-[11px] text-dim">
        <CardIcon id={id} className="size-3" />
        <span className="capitalize">{card.types.map((t) => TYPE_LABELS[t]).join(" · ")}</span>
        {count !== undefined && <span className="ml-auto font-mono text-ink">×{count}</span>}
      </span>
      <p className="mt-0.5 leading-snug whitespace-pre-line text-dim">{card.text}</p>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={className}
        style={style}
        onClick={onClick}
        title={title}
        aria-label={card.name}
        aria-pressed={state === "selected" ? true : undefined}
      >
        {body}
      </button>
    );
  }
  return (
    <div className={className} style={style} title={title}>
      {body}
    </div>
  );
}

/** A card's cost: the most important number when buying, so it's the boldest mark on the card. */
export function Cost({ value, size = "sm" }: { value: number; size?: "sm" | "lg" }) {
  const sizing = size === "lg" ? "size-7 text-sm" : "h-5 min-w-5 px-1 text-[12px]";
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded bg-ink font-mono font-bold text-void ${sizing}`}
      aria-label={`Cost ${value}`}
    >
      {value}
    </span>
  );
}
