import type { ServiceNode } from "../lib/types";

const wave = (n: number, phase: number) =>
  Array.from({ length: n }, (_, i) => 0.45 + 0.3 * Math.sin((i + phase) / 3) + 0.1 * Math.cos(i * 1.7));

/**
 * A fictional event pipeline for a fleet of warehouse sensors.
 * Every name, host and number here is invented for the demo.
 */
export const sampleNodes: ServiceNode[] = [
  {
    id: "cfg",
    name: "Config Service",
    host: "10.0.0.10",
    kind: "control",
    health: "up",
    upstream: [],
    metrics: [{ label: "State", value: "Healthy" }],
    details: { Release: "2.4.1", Owner: "platform-team", Deployed: "2026-11-02", Region: "us-east" },
    load: wave(24, 0),
  },
  {
    id: "gw-a",
    name: "Sensor Gateway A",
    host: "10.0.1.21",
    kind: "edge",
    health: "up",
    upstream: [],
    metrics: [],
    load: [],
  },
  {
    id: "gw-b",
    name: "Sensor Gateway B",
    host: "10.0.1.22",
    kind: "edge",
    health: "up",
    upstream: [],
    metrics: [],
    load: [],
  },
  {
    id: "broker-1",
    name: "Event Broker 1",
    host: "10.0.2.11",
    kind: "broker",
    health: "up",
    upstream: ["cfg", "gw-a"],
    metrics: [
      { label: "Inputs", value: 3, group: "in" },
      { label: "Replication", value: "OK" },
      { label: "Queue", value: "OK" },
      { label: "Outputs", value: 2, group: "out" },
    ],
    load: wave(24, 2),
  },
  {
    id: "broker-2",
    name: "Event Broker 2",
    host: "10.0.2.12",
    kind: "broker",
    health: "up",
    upstream: ["cfg", "gw-b"],
    metrics: [
      { label: "Inputs", value: 3, group: "in" },
      { label: "Replication", value: "OK" },
      { label: "Queue", value: "OK" },
      { label: "Outputs", value: 2, group: "out" },
    ],
    load: wave(24, 5),
  },
  {
    id: "router",
    name: "Stream Router",
    host: "10.0.3.5",
    kind: "pipeline",
    health: "up",
    upstream: ["broker-1", "broker-2"],
    metrics: [
      { label: "Inputs", value: 2, group: "in" },
      { label: "Events last hour", value: "48,210" },
      { label: "Outputs", value: 3, group: "out" },
    ],
    load: wave(24, 7),
  },
  {
    id: "logs",
    name: "Log Collector",
    host: "10.0.4.2",
    kind: "edge",
    health: "up",
    upstream: ["broker-2"],
    metrics: [{ label: "Lines last hour", value: "1,302" }],
    load: [],
  },
  {
    id: "dash",
    name: "Ops Dashboard",
    host: "10.0.5.40",
    kind: "consumer",
    health: "up",
    upstream: ["router"],
    metrics: [
      { label: "Topics", value: 3, group: "in" },
      { label: "Events / sec", value: "6,000", group: "out" },
    ],
    load: wave(24, 1),
  },
  {
    id: "alerts",
    name: "Alerting Client",
    host: "10.0.5.41",
    kind: "consumer",
    health: "up",
    upstream: ["router"],
    metrics: [
      { label: "Topics", value: 2, group: "in" },
      { label: "Events / sec", value: "--", group: "out" },
    ],
    load: [],
  },
  {
    id: "archive",
    name: "Archive Writer",
    host: "10.0.6.9",
    kind: "pipeline",
    health: "up",
    upstream: ["router", "logs"],
    metrics: [
      { label: "Inputs", value: 2, group: "in" },
      { label: "Rows last hour", value: "9,880" },
      { label: "Outputs", value: 1, group: "out" },
    ],
    load: wave(24, 4),
  },
];
