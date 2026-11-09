import type { ServiceNode } from "../lib/types";
import { orderMetrics } from "./NodeCard";

interface Props {
  node: ServiceNode | undefined;
  upstream: ServiceNode[];
  downstream: ServiceNode[];
  onClose: () => void;
}

export function DetailPanel({ node, upstream, downstream, onClose }: Props) {
  if (!node) return null;
  const list = (ns: ServiceNode[]) =>
    ns.length ? ns.map((n) => <li key={n.id} className={`is-${n.health}`}>{n.name}</li>) : <li className="muted">None</li>;

  return (
    <aside className="panel" aria-label={`${node.name} details`}>
      <header>
        <div>
          <h2>{node.name}</h2>
          <p className="muted">{node.host} · {node.kind}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close details">×</button>
      </header>
      <p className={`pill is-${node.health}`}>{node.health}</p>
      {node.details && (
        <dl className="kv">
          {Object.entries(node.details).map(([k, v]) => (
            <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
          ))}
        </dl>
      )}
      {node.metrics.length > 0 && (
        <dl className="kv">
          {orderMetrics(node.metrics).map((m) => (
            <div key={m.label}><dt>{m.label}</dt><dd>{m.value}</dd></div>
          ))}
        </dl>
      )}
      <h3>Receives from</h3>
      <ul className="links">{list(upstream)}</ul>
      <h3>Sends to</h3>
      <ul className="links">{list(downstream)}</ul>
    </aside>
  );
}
