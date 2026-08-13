import type { FinalProjectValidationResult, JsonValue } from "../domain/final-project-model";

const componentLabels: Readonly<Record<string, string>> = Object.freeze({
  cdn: "CDN",
  frontend: "Next.js Frontend",
  "load-balancer": "Load Balancer",
  "api-cluster": "API Service Cluster",
  redis: "Redis",
  postgres: "PostgreSQL",
  "read-replicas": "Read Replicas",
  "job-queue": "Job Queue",
  "worker-cluster": "Worker Cluster",
  puppeteer: "Puppeteer",
  "axe-core": "axe-core",
  "object-storage": "Object Storage / Reports",
  notification: "Notification Service",
  "status-stream": "Live Status Stream",
});

const ruleLabels: Readonly<Record<string, string>> = Object.freeze({
  "api-independent": "Незалежне масштабування API",
  "workers-independent": "Незалежне масштабування workers",
  "retry-dlq": "Bounded retry та DLQ",
  "realtime-pubsub": "Shared Pub/Sub для live status",
  "async-reports": "Асинхронна генерація reports",
  "multi-az-failover": "Multi-AZ failover",
  "resilience-guards": "Timeout і circuit breaker",
  "degraded-mode": "Graceful degradation",
  "pitr-rpo-rto": "PITR, RPO та RTO",
  "warm-standby": "Warm standby region",
});

const scenarioLabels: Readonly<Record<string, string>> = Object.freeze({
  "db-primary": "Відмова primary database",
  "api-instance": "Відмова одного API instance",
  "redis-outage": "Недоступність Redis",
  "region-outage": "Недоступність primary region",
});

type ArchitectureSummary = Readonly<{
  componentIds: readonly string[];
  ruleIds: readonly string[];
  scenarioId: string;
  componentLabels: readonly string[];
  ruleLabels: readonly string[];
  scenarioLabel: string;
  connections: readonly Readonly<{ from: string; to: string; fromLabel: string; toLabel: string }>[];
}>;

function stateRecord(state: JsonValue) {
  return state && typeof state === "object" && !Array.isArray(state) ? state as Readonly<Record<string, JsonValue>> : {};
}

function stringIds(value: JsonValue | undefined) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (typeof entry === "string") return [entry];
    if (entry && typeof entry === "object" && !Array.isArray(entry) && typeof entry.id === "string") return [entry.id];
    return [];
  });
}

export function describeFinalProjectState(state: JsonValue): ArchitectureSummary {
  const source = stateRecord(state);
  const componentIds = stringIds(source.components);
  const ruleIds = stringIds(source.rules);
  const scenarioId = typeof source.scenario === "string" ? source.scenario : "unknown";
  const connections = Array.isArray(source.connections) ? source.connections.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry) || typeof entry.from !== "string" || typeof entry.to !== "string") return [];
    return [{ from: entry.from, to: entry.to, fromLabel: componentLabels[entry.from] ?? entry.from, toLabel: componentLabels[entry.to] ?? entry.to }];
  }) : [];
  return {
    componentIds,
    ruleIds,
    scenarioId,
    componentLabels: componentIds.map((id) => componentLabels[id] ?? id),
    ruleLabels: ruleIds.map((id) => ruleLabels[id] ?? id),
    scenarioLabel: scenarioLabels[scenarioId] ?? scenarioId,
    connections,
  };
}

export function describeAffectedIds(result: FinalProjectValidationResult) {
  return result.affectedIds.map((id) => componentLabels[id] ?? ruleLabels[id] ?? id);
}
