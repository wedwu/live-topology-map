import type { Metric, ServiceNode } from "../lib/types";
import { Sparkline } from "./Sparkline";

export const healthColor = {
  up: "var(--up)",
  degraded: "var(--degraded)",
  down: "var(--down)",
} as const;

const healthLabel = { up: "Healthy", degraded: "Degraded", down: "Down" } as const;

/** Inputs first, outputs last, everything else in between, original order kept inside each group. */
export function orderMetrics(metrics: Metric[]): Metric[] {
  const rank = (m: Metric) => (m.group === "in" ? 0 : m.group === "out" ? 2 : 1);
  return metrics.map((m, i) => ({ m, i })).sort((a, b) => rank(a.m) - rank(b.m) || a.i - b.i).map((x) => x.m);
}

interface Props {
  node: ServiceNode;
  selected: boolean;
  onSelect: (id: string) => void;
}

export function NodeCard({ node, selected, onSelect }: Props) {
  const color = healthColor[node.health];
  const metrics = orderMetrics(node.metrics);

  return (
    <button
      type="button"
      className={`card card--${node.kind} is-${node.health}${selected ? " is-selected" : ""}`}
      data-node-id={node.id}
      style={{ ["--health" as string]: color }}
      onClick={() => onSelect(node.id)}
      aria-pressed={selected}
      aria-label={`${node.name}, ${healthLabel[node.health]}`}
    >
      <Sparkline values={node.load} color={color} />
      <div className="card__body">
        <div className="card__id">
          <span className="card__name">{node.name}</span>
          <span className="card__host">{node.host}</span>
          <span className="card__badge">{healthLabel[node.health]}</span>
          {node.kind === "control" && node.details && (
            <dl className="card__details">
              {Object.entries(node.details).map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
        {metrics.length > 0 && (
          <ul className="card__metrics">
            {metrics.map((m) => (
              <li key={m.label}>
                <strong>{m.value}</strong>
                <span>{m.label}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </button>
  );
}
