import { getCard, type CardId, type CardType } from "@/engine";

/** Per-type colors: the frame, the panel tint, the header stripe, and the title/label text. */
const TONES: Record<CardType, { frame: string; tint: string; stripe: string; text: string }> = {
  treasure: {
    frame: "border-amber-400/60",
    tint: "from-amber-900/70",
    stripe: "bg-amber-400",
    text: "text-amber-200",
  },
  victory: {
    frame: "border-teal-400/60",
    tint: "from-teal-900/70",
    stripe: "bg-teal-400",
    text: "text-teal-200",
  },
  curse: {
    frame: "border-fuchsia-500/60",
    tint: "from-fuchsia-950/90",
    stripe: "bg-fuchsia-500",
    text: "text-fuchsia-200",
  },
  reaction: {
    frame: "border-sky-400/60",
    tint: "from-sky-900/70",
    stripe: "bg-sky-400",
    text: "text-sky-200",
  },
  attack: {
    frame: "border-rose-500/60",
    tint: "from-rose-950/90",
    stripe: "bg-rose-500",
    text: "text-rose-200",
  },
  action: {
    frame: "border-slate-400/40",
    tint: "from-slate-700/60",
    stripe: "bg-slate-300",
    text: "text-slate-100",
  },
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

/** The type that decides a card's color, most specific first. */
function toneFor(id: CardId) {
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
  state?: "idle" | "available" | "reachable" | "selected" | "option";
  dimmed?: boolean;
  /** Also drain the color, for cards that are out of reach. */
  muted?: boolean;
  onClick?: () => void;
  title?: string;
}

/** Cyan means "you can act on this", so it never clashes with a card's own type color. */
const STATE_RING = {
  idle: "",
  available:
    "ring-2 ring-signal shadow-[0_0_18px_rgb(34_211_238/0.45)] hover:-translate-y-0.5 cursor-pointer",
  reachable:
    "outline-2 outline-dashed outline-offset-2 outline-cyan-300/70 hover:-translate-y-0.5 cursor-pointer",
  selected: "ring-2 ring-amber-300 shadow-[0_0_18px_rgb(252_211_77/0.5)] -translate-y-2",
  option:
    "ring-2 ring-violet-400 shadow-[0_0_16px_rgb(167_139_250/0.45)] hover:-translate-y-0.5 cursor-pointer",
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
  const tone = toneFor(id);
  const sizing = size === "sm" ? "w-28 min-h-32 text-[11px]" : "w-32 min-h-44 text-xs";
  const className = [
    "relative flex flex-col overflow-visible rounded-md border bg-gradient-to-b to-slate-950 to-70% text-left shadow-lg shadow-black/50 transition",
    sizing,
    tone.frame,
    tone.tint,
    STATE_RING[state],
    dimmed ? "opacity-40" : "",
    muted ? "grayscale" : "",
  ].join(" ");

  const body = (
    <>
      <span aria-hidden className={`h-1 rounded-t-[5px] ${tone.stripe}`} />
      <div className="flex flex-1 flex-col gap-1 p-2">
        <div className="flex items-start justify-between gap-1">
          <span
            className={`font-hud text-[12px] leading-tight font-bold tracking-wide uppercase ${tone.text}`}
          >
            {card.name}
          </span>
          <span
            className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-sm bg-amber-300 px-1 font-mono text-[11px] font-bold text-slate-950 shadow-[0_0_8px_rgb(252_211_77/0.5)]"
            aria-label={`Cost ${card.cost}`}
          >
            {card.cost}
          </span>
        </div>
        <span
          className={`font-hud text-[10px] tracking-[0.16em] uppercase opacity-70 ${tone.text}`}
        >
          {card.types.map((t) => TYPE_LABELS[t]).join(" · ")}
        </span>
        <span aria-hidden className={`h-px w-full opacity-30 ${tone.stripe}`} />
        <p className="leading-snug whitespace-pre-line text-slate-300">{card.text}</p>
      </div>
      {count !== undefined && (
        <span className="absolute -right-2 -bottom-2 rounded-sm border border-cyan-300/40 bg-void px-1.5 py-0.5 font-mono text-[11px] font-semibold text-cyan-100">
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
