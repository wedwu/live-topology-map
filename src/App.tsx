import { useEffect, useMemo, useRef, useState } from "react";
import { DetailPanel } from "./components/DetailPanel";
import { LeaderLines } from "./components/LeaderLines";
import { NodeCard } from "./components/NodeCard";
import { sampleNodes } from "./data/sample";
import { applyMessage, createFeed, type FeedState } from "./lib/feed";
import { countCrossings, layoutGraph } from "./lib/layout";
import type { ServiceNode } from "./lib/types";

const FEED_URL = import.meta.env.VITE_FEED_URL as string | undefined;

export default function App() {
  const [nodes, setNodes] = useState<ServiceNode[]>([]);
  const [feedState, setFeedState] = useState<FeedState>("connecting");
  const [selected, setSelected] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const feed = createFeed(sampleNodes, FEED_URL);
    const offState = feed.onState(setFeedState);
    const offMsg = feed.subscribe((msg) => setNodes((prev) => applyMessage(prev, msg)));
    return () => {
      offState();
      offMsg();
      feed.close();
    };
  }, []);

  // Layout only depends on the graph shape, not on live metrics, so cards do not jump around.
  const shapeKey = nodes.map((n) => `${n.id}:${n.upstream.join(",")}`).join("|");
  const layout = useMemo(() => layoutGraph(nodes), [shapeKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const health = useMemo(() => new Map(nodes.map((n) => [n.id, n.health])), [nodes]);
  const down = nodes.filter((n) => n.health === "down").length;
  const degraded = nodes.filter((n) => n.health === "degraded").length;

  const sel = selected ? byId.get(selected) : undefined;
  const upstream = sel ? sel.upstream.map((id) => byId.get(id)).filter((n): n is ServiceNode => !!n) : [];
  const downstream = sel ? nodes.filter((n) => n.upstream.includes(sel.id)) : [];

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1>Live Topology Map</h1>
          <p className="muted">
            {nodes.length} services · {layout.edges.length} links · {layout.columns.length} layers ·{" "}
            {countCrossings(layout)} crossings
          </p>
        </div>
        <div className="status">
          <span className={`dot is-${feedState}`} /> {FEED_URL ? "WebSocket" : "Simulated feed"}: {feedState}
          <span className="pill is-down">{down} down</span>
          <span className="pill is-degraded">{degraded} degraded</span>
        </div>
      </header>

      {(layout.danglingRefs.length > 0 || layout.cyclic.length > 0) && (
        <p className="warning" role="status">
          {layout.danglingRefs.length > 0 && `${layout.danglingRefs.length} link(s) point to unknown services. `}
          {layout.cyclic.length > 0 && `Cycle detected: ${layout.cyclic.join(", ")} placed in the last column.`}
        </p>
      )}

      <main className="stage">
        <div className="canvas" ref={canvasRef}>
          <LeaderLines container={canvasRef} edges={layout.edges} health={health} focus={selected} version={nodes} />
          {layout.columns.map((col, i) => (
            <section className="column" key={i} aria-label={`Layer ${i + 1}`}>
              {col.map((id) => {
                const n = byId.get(id);
                return n ? (
                  <NodeCard key={id} node={n} selected={selected === id} onSelect={(x) => setSelected(x === selected ? null : x)} />
                ) : null;
              })}
            </section>
          ))}
          {nodes.length === 0 && <p className="muted">Waiting for the first snapshot…</p>}
        </div>
        <DetailPanel node={sel} upstream={upstream} downstream={downstream} onClose={() => setSelected(null)} />
      </main>
    </div>
  );
}
