import { useLayoutEffect, useState, type RefObject } from "react";
import type { Edge, Health } from "../lib/types";
import { healthColor } from "./NodeCard";

interface Path {
  key: string;
  d: string;
  color: string;
  dimmed: boolean;
}

interface Props {
  container: RefObject<HTMLElement>;
  edges: Edge[];
  health: Map<string, Health>;
  focus: string | null;
  /** Bump to force a re-measure (for example after cards change size). */
  version: unknown;
}

/**
 * Measures each card's on-screen box and draws an S-curve from the right edge of the
 * upstream card to the left edge of the downstream card. Re-measures on resize and scroll.
 */
export function LeaderLines({ container, edges, health, focus, version }: Props) {
  const [paths, setPaths] = useState<Path[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const root = container.current;
    if (!root) return;

    const measure = () => {
      const base = root.getBoundingClientRect();
      const box = (id: string) =>
        root.querySelector<HTMLElement>(`[data-node-id="${CSS.escape(id)}"]`)?.getBoundingClientRect();

      const next: Path[] = [];
      for (const e of edges) {
        const a = box(e.from);
        const b = box(e.to);
        if (!a || !b) continue;
        const x1 = a.right - base.left + root.scrollLeft;
        const y1 = a.top + a.height / 2 - base.top + root.scrollTop;
        const x2 = b.left - base.left + root.scrollLeft;
        const y2 = b.top + b.height / 2 - base.top + root.scrollTop;
        const bend = Math.max(24, (x2 - x1) / 2);
        const worst = health.get(e.from) === "down" || health.get(e.to) === "down" ? "down" : health.get(e.to) ?? "up";
        next.push({
          key: `${e.from}->${e.to}`,
          d: `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`,
          color: healthColor[worst],
          dimmed: focus !== null && e.from !== focus && e.to !== focus,
        });
      }
      setPaths(next);
      setSize({ w: root.scrollWidth, h: root.scrollHeight });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    root.querySelectorAll("[data-node-id]").forEach((el) => ro.observe(el));
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [container, edges, health, focus, version]);

  return (
    <svg className="leader-lines" width={size.w} height={size.h} aria-hidden="true">
      {paths.map((p) => (
        <path key={p.key} d={p.d} stroke={p.color} className={p.dimmed ? "is-dimmed" : undefined} />
      ))}
    </svg>
  );
}
