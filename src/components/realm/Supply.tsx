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

interface SupplyProps {
  view: PlayerView;
  cardState: (id: CardId) => CardProps["state"];
  onPick: (id: CardId) => void;
}

export function Supply({ view, cardState, onPick }: SupplyProps) {
  const kingdom = [...view.kingdom].sort(
    (a, b) => getCard(a).cost - getCard(b).cost || a.localeCompare(b),
  );

  const render = (id: CardId) => {
    const state = cardState(id);
    const clickable = state === "available" || state === "option";
    return (
      <Card
        key={id}
        id={id}
        size="sm"
        count={view.supply[id]}
        state={state}
        dimmed={view.supply[id] === 0}
        onClick={clickable ? () => onPick(id) : undefined}
      />
    );
  };

  return (
    <section aria-label="Supply" className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">{BASIC_ROW.map(render)}</div>
      <div className="flex flex-wrap gap-3">{kingdom.map(render)}</div>
    </section>
  );
}
