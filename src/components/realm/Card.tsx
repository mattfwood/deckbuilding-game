import { getCard, type CardId, type CardType } from "@/engine";

const TONES: Record<CardType, string> = {
  treasure: "border-amber-400 bg-amber-50 dark:border-amber-500/70 dark:bg-amber-950/40",
  victory: "border-emerald-400 bg-emerald-50 dark:border-emerald-500/70 dark:bg-emerald-950/40",
  curse: "border-purple-400 bg-purple-50 dark:border-purple-500/70 dark:bg-purple-950/40",
  reaction: "border-sky-400 bg-sky-50 dark:border-sky-500/70 dark:bg-sky-950/40",
  attack: "border-rose-400 bg-rose-50 dark:border-rose-500/70 dark:bg-rose-950/40",
  action: "border-stone-300 bg-white dark:border-stone-600 dark:bg-stone-900",
};

/** The type that decides a card's color, most specific first. */
function toneFor(id: CardId): string {
  const types = getCard(id).types;
  const order: CardType[] = ["reaction", "attack", "curse", "victory", "treasure", "action"];
  return TONES[order.find((t) => types.includes(t)) ?? "action"];
}

export interface CardProps {
  id: CardId;
  /** Pile size, for supply cards. */
  count?: number;
  size?: "sm" | "md";
  /** Visual state: playable/buyable, chosen in a selection, or a decision option. */
  state?: "idle" | "available" | "selected" | "option";
  dimmed?: boolean;
  onClick?: () => void;
  title?: string;
}

const STATE_RING = {
  idle: "",
  available: "ring-2 ring-amber-500 hover:-translate-y-0.5 cursor-pointer",
  selected: "ring-4 ring-rose-500 -translate-y-2",
  option: "ring-2 ring-sky-500 hover:-translate-y-0.5 cursor-pointer",
};

export function Card({
  id,
  count,
  size = "md",
  state = "idle",
  dimmed,
  onClick,
  title,
}: CardProps) {
  const card = getCard(id);
  const sizing = size === "sm" ? "w-28 min-h-32 p-2 text-[11px]" : "w-32 min-h-44 p-2.5 text-xs";
  const className = [
    "relative flex flex-col gap-1 rounded-lg border-2 text-left shadow-sm transition",
    sizing,
    toneFor(id),
    STATE_RING[state],
    dimmed ? "opacity-40" : "",
  ].join(" ");

  const body = (
    <>
      <div className="flex items-start justify-between gap-1">
        <span className="font-semibold leading-tight text-stone-900 dark:text-stone-50">
          {card.name}
        </span>
        <span
          className="flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-400 text-[11px] font-bold text-amber-950"
          aria-label={`Cost ${card.cost}`}
        >
          {card.cost}
        </span>
      </div>
      <span className="text-[10px] uppercase tracking-wide text-stone-500 dark:text-stone-400">
        {card.types.join(" · ")}
      </span>
      <p className="whitespace-pre-line leading-snug text-stone-700 dark:text-stone-300">
        {card.text}
      </p>
      {count !== undefined && (
        <span className="absolute -bottom-2 -right-2 rounded-full bg-stone-800 px-2 py-0.5 text-[11px] font-semibold text-white dark:bg-stone-200 dark:text-stone-900">
          {count}
        </span>
      )}
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
