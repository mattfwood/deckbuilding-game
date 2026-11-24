import {
  MALWARE,
  ARCOLOGY,
  ALLOY,
  HABITAT,
  FUSION_CELL,
  ORE,
  BIODOME,
  getCard,
  type CardId,
  type PlayerView,
} from "@/engine";
import { Card, type CardProps } from "./Card";

const BASIC_ROW: CardId[] = [ORE, ALLOY, FUSION_CELL, HABITAT, BIODOME, ARCOLOGY, MALWARE];

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
    <section aria-label="Supply" className="panel flex flex-col gap-4 p-3 sm:p-4">
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
    return <p className="hud-label">No buys left this turn</p>;
  }
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-dim">
      <span className="font-hud text-base font-semibold tracking-wide text-amber-200">
        {coins} credit{coins === 1 ? "" : "s"} to spend
        {potentialCoins > coins && (
          <span className="text-sm font-medium text-dim">
            {" "}
            ({potentialCoins} with all resources)
          </span>
        )}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block size-3 rounded-sm ring-2 ring-signal" /> Affordable now
      </span>
      {potentialCoins > coins && (
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm outline-2 outline-dashed outline-cyan-300/70" />{" "}
          After playing resources
        </span>
      )}
      <span className="flex items-center gap-1.5">
        <span className="inline-block size-3 rounded-sm bg-slate-500 opacity-40" /> Too expensive
      </span>
    </div>
  );
}
