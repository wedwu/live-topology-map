import type { FeedMessage, Health, ServiceNode } from "./types";

export type FeedState = "connecting" | "live" | "closed";

export interface Feed {
  subscribe(listener: (msg: FeedMessage) => void): () => void;
  onState(listener: (state: FeedState) => void): () => void;
  close(): void;
}

/**
 * Connects to a real backend when a URL is given (JSON messages shaped like FeedMessage),
 * otherwise runs a local simulation so the demo works with no server.
 */
export function createFeed(seed: ServiceNode[], url?: string): Feed {
  return url ? socketFeed(url) : simulatedFeed(seed);
}

function emitter<T>() {
  const ls = new Set<(v: T) => void>();
  return {
    on(l: (v: T) => void) {
      ls.add(l);
      return () => void ls.delete(l);
    },
    emit(v: T) {
      ls.forEach((l) => l(v));
    },
  };
}

function socketFeed(url: string): Feed {
  const messages = emitter<FeedMessage>();
  const states = emitter<FeedState>();
  let ws: WebSocket | null = null;
  let retry = 0;
  let stopped = false;

  const connect = () => {
    states.emit("connecting");
    ws = new WebSocket(url);
    ws.onopen = () => {
      retry = 0;
      states.emit("live");
    };
    ws.onmessage = (ev) => {
      try {
        messages.emit(JSON.parse(ev.data) as FeedMessage);
      } catch {
        // Ignore anything that is not valid JSON.
      }
    };
    ws.onclose = () => {
      states.emit("closed");
      if (!stopped) setTimeout(connect, Math.min(30_000, 1000 * 2 ** retry++));
    };
  };
  connect();

  return {
    subscribe: messages.on,
    onState: states.on,
    close() {
      stopped = true;
      ws?.close();
    },
  };
}

function simulatedFeed(seed: ServiceNode[]): Feed {
  const messages = emitter<FeedMessage>();
  const states = emitter<FeedState>();
  const timers: number[] = [];
  const health = new Map(seed.map((n) => [n.id, n.health]));

  timers.push(
    window.setTimeout(() => {
      states.emit("live");
      messages.emit({ type: "snapshot", nodes: structuredClone(seed) });
    }, 300),
  );

  // New load sample for every node that has a sparkline, once a second.
  timers.push(
    window.setInterval(() => {
      for (const n of seed) {
        if (!n.load.length || health.get(n.id) === "down") continue;
        const v = Math.min(1, Math.max(0, 0.5 + (Math.random() - 0.5) * 0.7));
        messages.emit({ type: "sample", id: n.id, value: v });
      }
    }, 1000),
  );

  // Every few seconds, knock a random node down or bring one back.
  timers.push(
    window.setInterval(() => {
      const n = seed[Math.floor(Math.random() * seed.length)];
      const next: Health = health.get(n.id) === "down" ? "up" : Math.random() < 0.6 ? "down" : "degraded";
      health.set(n.id, next);
      messages.emit({ type: "patch", id: n.id, changes: { health: next } });
    }, 4000),
  );

  return {
    subscribe: messages.on,
    onState(l) {
      l("connecting");
      return states.on(l);
    },
    close() {
      timers.forEach((t) => {
        clearTimeout(t);
        clearInterval(t);
      });
      states.emit("closed");
    },
  };
}

/** Pure reducer so the same update logic works for simulated and real feeds. */
export function applyMessage(nodes: ServiceNode[], msg: FeedMessage, maxSamples = 24): ServiceNode[] {
  switch (msg.type) {
    case "snapshot":
      return msg.nodes;
    case "patch":
      return nodes.map((n) => (n.id === msg.id ? { ...n, ...msg.changes } : n));
    case "sample":
      return nodes.map((n) => (n.id === msg.id ? { ...n, load: [...n.load, msg.value].slice(-maxSamples) } : n));
  }
}
