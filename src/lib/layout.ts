import type { Edge, ServiceNode } from "./types";

export interface LayoutResult {
  /** Node ids grouped into columns, left (sources) to right (sinks), already ordered top to bottom. */
  columns: string[][];
  /** Column and row for every node id. */
  position: Map<string, { col: number; row: number }>;
  edges: Edge[];
  /** References to ids that do not exist in the data set. */
  danglingRefs: Edge[];
  /** Nodes that sat on a cycle and were placed after the rest of the graph. */
  cyclic: string[];
}

/**
 * Layered layout for a directed service graph.
 *
 * 1. Build edges from each node's `upstream` list, dropping references to unknown ids.
 * 2. Assign columns with a longest-path pass over a topological order (Kahn's algorithm),
 *    so every node sits one column to the right of its deepest upstream.
 *    Nodes caught in a cycle cannot be ordered; they go in one extra column at the end.
 * 3. Order rows inside each column with alternating barycenter sweeps: a node moves toward
 *    the average row of its neighbours in the adjacent column. This keeps related nodes level
 *    and cuts down on crossing lines.
 */
export function layoutGraph(nodes: ServiceNode[], sweeps = 4): LayoutResult {
  const ids = new Set(nodes.map((n) => n.id));
  const edges: Edge[] = [];
  const danglingRefs: Edge[] = [];

  for (const n of nodes) {
    for (const up of n.upstream) {
      if (up === n.id) continue;
      (ids.has(up) ? edges : danglingRefs).push({ from: up, to: n.id });
    }
  }

  const incoming = new Map<string, string[]>();
  const outgoing = new Map<string, string[]>();
  for (const id of ids) {
    incoming.set(id, []);
    outgoing.set(id, []);
  }
  for (const e of edges) {
    outgoing.get(e.from)!.push(e.to);
    incoming.get(e.to)!.push(e.from);
  }

  // Kahn's algorithm, computing the longest path from any source as we go.
  const remaining = new Map<string, number>();
  for (const id of ids) remaining.set(id, incoming.get(id)!.length);
  const col = new Map<string, number>();
  const queue: string[] = [];
  for (const n of nodes) {
    if (remaining.get(n.id) === 0) {
      col.set(n.id, 0);
      queue.push(n.id);
    }
  }
  while (queue.length) {
    const id = queue.shift()!;
    for (const next of outgoing.get(id)!) {
      col.set(next, Math.max(col.get(next) ?? 0, col.get(id)! + 1));
      remaining.set(next, remaining.get(next)! - 1);
      if (remaining.get(next) === 0) queue.push(next);
    }
  }

  const cyclic = nodes.map((n) => n.id).filter((id) => remaining.get(id)! > 0);
  const lastCol = Math.max(-1, ...nodes.filter((n) => !cyclic.includes(n.id)).map((n) => col.get(n.id)!));
  for (const id of cyclic) col.set(id, lastCol + 1);

  const columnCount = Math.max(0, ...[...col.values()]) + 1;
  const columns: string[][] = Array.from({ length: nodes.length ? columnCount : 0 }, () => []);
  const nameOf = new Map(nodes.map((n) => [n.id, n.name]));
  for (const n of nodes) columns[col.get(n.id)!].push(n.id);
  for (const c of columns) c.sort((a, b) => nameOf.get(a)!.localeCompare(nameOf.get(b)!));

  const rowOf = () => {
    const m = new Map<string, number>();
    columns.forEach((c) => c.forEach((id, i) => m.set(id, i)));
    return m;
  };

  const reorder = (c: number, neighbours: Map<string, string[]>) => {
    const rows = rowOf();
    const score = new Map<string, number>();
    columns[c].forEach((id, i) => {
      const ns = neighbours.get(id)!.filter((n) => col.get(n) !== c);
      score.set(id, ns.length ? ns.reduce((s, n) => s + rows.get(n)!, 0) / ns.length : i);
    });
    // Stable sort keeps the current order for ties.
    columns[c] = columns[c]
      .map((id, i) => ({ id, i }))
      .sort((a, b) => score.get(a.id)! - score.get(b.id)! || a.i - b.i)
      .map((x) => x.id);
  };

  for (let s = 0; s < sweeps; s++) {
    for (let c = 1; c < columns.length; c++) reorder(c, incoming);
    for (let c = columns.length - 2; c >= 0; c--) reorder(c, outgoing);
  }

  const build = (): LayoutResult => {
    const position = new Map<string, { col: number; row: number }>();
    columns.forEach((c, ci) => c.forEach((id, ri) => position.set(id, { col: ci, row: ri })));
    return { columns, position, edges, danglingRefs, cyclic };
  };

  // Transpose pass: swap neighbours in a column whenever that lowers the crossing count.
  // Barycenter gets close; this cleans up the last few crossings it leaves behind.
  let best = countCrossings(build());
  for (let pass = 0; pass < 10 && best > 0; pass++) {
    let improved = false;
    for (const c of columns) {
      for (let i = 0; i + 1 < c.length; i++) {
        [c[i], c[i + 1]] = [c[i + 1], c[i]];
        const score = countCrossings(build());
        if (score < best) {
          best = score;
          improved = true;
        } else {
          [c[i], c[i + 1]] = [c[i + 1], c[i]];
        }
      }
    }
    if (!improved) break;
  }

  return build();
}

/** Number of edge pairs that cross between adjacent columns. Used by tests and the debug readout. */
export function countCrossings(result: LayoutResult): number {
  const { edges, position } = result;
  const spans = edges
    .map((e) => ({ a: position.get(e.from)!, b: position.get(e.to)! }))
    .filter((s) => s.b.col === s.a.col + 1);
  let crossings = 0;
  for (let i = 0; i < spans.length; i++) {
    for (let j = i + 1; j < spans.length; j++) {
      const p = spans[i];
      const q = spans[j];
      if (p.a.col !== q.a.col) continue;
      if ((p.a.row - q.a.row) * (p.b.row - q.b.row) < 0) crossings++;
    }
  }
  return crossings;
}
