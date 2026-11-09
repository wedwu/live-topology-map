export type Health = "up" | "degraded" | "down";

/** Broad families of nodes. Each kind gets its own card layout. */
export type NodeKind = "control" | "broker" | "pipeline" | "consumer" | "edge";

/**
 * One metric shown on a card. `group` decides where it lands:
 * "in" metrics render first, "out" metrics render last, everything else in between.
 */
export interface Metric {
  label: string;
  value: string | number;
  group?: "in" | "out" | "other";
}

export interface ServiceNode {
  id: string;
  name: string;
  host: string;
  kind: NodeKind;
  health: Health;
  /** ids of the nodes this one receives from. Edges point upstream -> this node. */
  upstream: string[];
  metrics: Metric[];
  /** Free-form key/value details shown on control nodes and in the detail panel. */
  details?: Record<string, string>;
  /** Recent load samples, each 0..1. Empty means no sparkline. */
  load: number[];
}

export interface Edge {
  from: string;
  to: string;
}

/** Messages a feed can emit. Mirrors what a real WebSocket backend would send. */
export type FeedMessage =
  | { type: "snapshot"; nodes: ServiceNode[] }
  | { type: "patch"; id: string; changes: Partial<Omit<ServiceNode, "id">> }
  | { type: "sample"; id: string; value: number };
