import {
  ALLOY,
  ARCOLOGY,
  BIODOME,
  FUSION_CELL,
  HABITAT,
  MALWARE,
  ORE,
  getCard,
  type CardId,
  type PlayerView,
} from "@/engine";
import { Cost } from "./Card";
import { CardIcon } from "./CardIcon";

const BASICS: CardId[] = [ORE, ALLOY, FUSION_CELL, HABITAT, BIODOME, ARCOLOGY, MALWARE];
/** Piles at or below this size show their count; above it the count is noise. */
const LOW_PILE = 3;

export interface SupplyDisplay {
  /** Clicking it buys it (or picks it, during a gain decision). */
  clickable: boolean;
  /** Faded: you can't take it right now. */
  muted: boolean;
}

interface SupplyProps {
  view: PlayerView;
  display: (id: CardId) => SupplyDisplay;
  onPick: (id: CardId) => void;
}

/**
 * The supply as compact tiles: cost, name and the card's full rules text (never
 * cut off). Nothing is highlighted by default; what you can't
 * afford is faded instead, and the accent only appears on hover.
 */
export function Supply({ view, display, onPick }: SupplyProps) {
  const projects = [...view.kingdom].sort(
    (a, b) => getCard(a).cost - getCard(b).cost || a.localeCompare(b),
  );
  const tile = (id: CardId) => (
    <SupplyTile
      key={id}
      id={id}
      left={view.supply[id] ?? 0}
      {...display(id)}
      onPick={() => onPick(id)}
    />
  );

  return (
    <section aria-label="Supply" className="flex flex-col gap-4">
      <Group title="Basics">{BASICS.map(tile)}</Group>
      <Group title="Projects">{projects.map(tile)}</Group>
    </section>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="hud-label">{title}</h2>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-2 sm:grid-cols-[repeat(auto-fill,minmax(12.5rem,1fr))]">
        {children}
      </div>
    </div>
  );
}

function SupplyTile({
  id,
  left,
  clickable,
  muted,
  onPick,
}: {
  id: CardId;
  left: number;
  clickable: boolean;
  muted: boolean;
  onPick: () => void;
}) {
  const card = getCard(id);
  const empty = left === 0;
  // The game ends when the Arcology pile runs out, so that count always matters.
  const showLeft = id === ARCOLOGY || left <= LOW_PILE;
  const summary = card.text.replace(/\n/g, " · ");

  const body = (
    <>
      <Cost value={card.cost} size="lg" />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-1.5">
          <CardIcon id={id} />
          <span className="text-sm leading-tight font-semibold text-ink">{card.name}</span>
        </span>
        <span className="text-xs leading-snug text-dim">{summary}</span>
      </span>
      {showLeft && (
        <span
          className={`shrink-0 self-start font-mono text-[11px] ${left <= LOW_PILE ? "text-danger" : "text-dim"}`}
        >
          {empty ? "empty" : `${left} left`}
        </span>
      )}
    </>
  );

  const className = [
    "flex w-full items-start gap-2.5 rounded-md border border-line bg-raise p-2 text-left transition",
    clickable ? "cursor-pointer hover:border-accent hover:bg-panel" : "cursor-default",
    muted || empty ? "opacity-35" : "",
  ].join(" ");

  return clickable && !empty ? (
    <button
      type="button"
      className={className}
      onClick={onPick}
      aria-label={`${card.name}, costs ${card.cost}${showLeft ? `, ${left} left` : ""}`}
    >
      {body}
    </button>
  ) : (
    <div className={className}>{body}</div>
  );
}
