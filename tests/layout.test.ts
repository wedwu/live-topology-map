import { describe, expect, it } from "vitest";
import { sampleNodes } from "../src/data/sample";
import { applyMessage } from "../src/lib/feed";
import { countCrossings, layoutGraph } from "../src/lib/layout";
import type { ServiceNode } from "../src/lib/types";

const node = (id: string, upstream: string[] = []): ServiceNode => ({
  id, name: id, host: "", kind: "pipeline", health: "up", upstream, metrics: [], load: [],
});

describe("layoutGraph", () => {
  it("places every node one column right of its deepest upstream", () => {
    const r = layoutGraph([node("a"), node("b", ["a"]), node("c", ["a", "b"])]);
    expect(r.position.get("a")!.col).toBe(0);
    expect(r.position.get("b")!.col).toBe(1);
    expect(r.position.get("c")!.col).toBe(2);
  });

  it("reports links to unknown services instead of crashing", () => {
    const r = layoutGraph([node("a", ["ghost"])]);
    expect(r.danglingRefs).toEqual([{ from: "ghost", to: "a" }]);
    expect(r.position.get("a")!.col).toBe(0);
  });

  it("puts nodes on a cycle into a final column", () => {
    const r = layoutGraph([node("a"), node("b", ["a", "c"]), node("c", ["b"])]);
    expect(r.cyclic.sort()).toEqual(["b", "c"]);
    expect(r.position.get("b")!.col).toBe(1);
  });

  it("removes avoidable crossings", () => {
    // Alphabetical order would cross: a->y, b->x.
    const r = layoutGraph([node("a"), node("b"), node("x", ["b"]), node("y", ["a"])]);
    expect(countCrossings(r)).toBe(0);
  });

  it("lays out the sample pipeline with no crossings", () => {
    expect(countCrossings(layoutGraph(sampleNodes))).toBe(0);
  });
});

describe("applyMessage", () => {
  it("keeps only the newest samples", () => {
    let ns = [node("a")];
    for (let i = 0; i < 30; i++) ns = applyMessage(ns, { type: "sample", id: "a", value: i / 30 }, 24);
    expect(ns[0].load).toHaveLength(24);
  });

  it("patches health without touching other nodes", () => {
    const ns = applyMessage([node("a"), node("b")], { type: "patch", id: "b", changes: { health: "down" } });
    expect(ns.map((n) => n.health)).toEqual(["up", "down"]);
  });
});
