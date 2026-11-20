import {
  BLIGHT,
  CAPITAL,
  CROWN,
  FARM,
  INGOT,
  PENNY,
  TOWN,
  getCard,
  type CardId,
  type PlayerView,
} from "@/engine";
import { Card, type CardProps } from "./Card";

const BASIC_ROW: CardId[] = [PENNY, CROWN, INGOT, FARM, TOWN, CAPITAL, BLIGHT];

export interface SupplyDisplay {
  state: NonNullable<CardProps["state"]>;
  /** Out of reach right now: greyed out. */
  muted: boolean;
}

interface SupplyProps {
  view: PlayerView;
  display: (id: CardId) => SupplyDisplay;
  onPick: (id: CardId) => void;
  /** Shown on your turn to explain the highlights. */
  legend: { coins: number; potentialCoins: number; buys: number } | null;
}

export function Supply({ view, display, onPick, legend }: SupplyProps) {
  const kingdom = [...view.kingdom].sort(
    (a, b) => getCard(a).cost - getCard(b).cost || a.localeCompare(b),
  );

  const render = (id: CardId) => {
    const { state, muted } = display(id);
    const clickable = state === "available" || state === "reachable" || state === "option";
    return (
      <Card
        key={id}
        id={id}
        size="sm"
        count={view.supply[id]}
        state={state}
        dimmed={view.supply[id] === 0 || muted}
        muted={muted}
        onClick={clickable ? () => onPick(id) : undefined}
      />
    );
  };

  return (
    <section aria-label="Supply" className="flex flex-col gap-4">
      {legend && <SupplyLegend {...legend} />}
      <div className="flex flex-wrap gap-3">{BASIC_ROW.map(render)}</div>
      <div className="flex flex-wrap gap-3">{kingdom.map(render)}</div>
    </section>
  );
}

function SupplyLegend({
  coins,
  potentialCoins,
  buys,
}: {
  coins: number;
  potentialCoins: number;
  buys: number;
}) {
  if (buys === 0) {
    return <p className="text-sm text-stone-500">No buys left this turn.</p>;
  }
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-600 dark:text-stone-400">
      <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">
        {coins} coin{coins === 1 ? "" : "s"} to spend
        {potentialCoins > coins && (
          <span className="font-normal text-stone-500"> ({potentialCoins} with all treasures)</span>
        )}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block size-3 rounded-sm ring-2 ring-amber-500" /> Affordable now
      </span>
      {potentialCoins > coins && (
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm outline-2 outline-dashed outline-amber-500" />{" "}
          After playing treasures
        </span>
      )}
      <span className="flex items-center gap-1.5">
        <span className="inline-block size-3 rounded-sm bg-stone-400 opacity-40" /> Too expensive
      </span>
    </div>
  );
}
