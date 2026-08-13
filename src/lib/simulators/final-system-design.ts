import { getLessons } from "@/content/course-contract";
import { highLoadArchitectureCourse } from "@/content/courses/high-load-architecture";

const finalDesignLesson = getLessons(highLoadArchitectureCourse).at(-1);
if (!finalDesignLesson) throw new Error("The final System Design lesson is missing");

export const FINAL_DESIGN_COURSE_ID = highLoadArchitectureCourse.id;
export const FINAL_DESIGN_LESSON_ID = finalDesignLesson.id;
export const FINAL_DESIGN_SIMULATOR_ID = "final-system-design";
export const FINAL_DESIGN_SCHEMA_VERSION = 1;

export const finalDesignComponentIds = [
  "cdn", "frontend", "load-balancer", "api-cluster", "redis", "postgres", "read-replicas",
  "job-queue", "worker-cluster", "puppeteer", "axe-core", "object-storage", "notification", "status-stream",
] as const;

export const finalDesignRuleIds = [
  "api-independent", "workers-independent", "retry-dlq", "realtime-pubsub", "async-reports",
  "multi-az-failover", "resilience-guards", "degraded-mode", "pitr-rpo-rto", "warm-standby",
] as const;

export const finalDesignScenarioIds = ["db-primary", "api-instance", "redis-outage", "region-outage", "traffic-spike"] as const;
const safeValue = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type FinalDesignState = {
  components: string[];
  rules: Array<{ id: string; value: string }>;
  scenario: string;
  connections: Array<{ from: string; to: string }>;
};

export function parseFinalDesignState(value: unknown): FinalDesignState | null {
  if (!value || typeof value !== "object") return null;
  const state = value as Record<string, unknown>;
  if (!Array.isArray(state.components) || !Array.isArray(state.rules) || typeof state.scenario !== "string") return null;
  if (state.components.length > finalDesignComponentIds.length || state.rules.length > finalDesignRuleIds.length) return null;
  if (!finalDesignScenarioIds.includes(state.scenario as (typeof finalDesignScenarioIds)[number])) return null;

  const components = state.components.filter((item): item is string => typeof item === "string");
  if (components.length !== state.components.length || new Set(components).size !== components.length) return null;
  if (components.some((id) => !finalDesignComponentIds.includes(id as (typeof finalDesignComponentIds)[number]))) return null;

  const rules = state.rules.filter((item): item is { id: string; value: string } => {
    if (!item || typeof item !== "object") return false;
    const rule = item as Record<string, unknown>;
    return typeof rule.id === "string"
      && finalDesignRuleIds.includes(rule.id as (typeof finalDesignRuleIds)[number])
      && typeof rule.value === "string"
      && (rule.value === "" || safeValue.test(rule.value));
  });
  if (rules.length !== state.rules.length || new Set(rules.map((rule) => rule.id)).size !== rules.length) return null;

  const rawConnections = state.connections === undefined ? [] : state.connections;
  if (!Array.isArray(rawConnections) || rawConnections.length > 100) return null;
  const connections = rawConnections.filter((item): item is { from: string; to: string } => {
    if (!item || typeof item !== "object") return false;
    const connection = item as Record<string, unknown>;
    return typeof connection.from === "string" && components.includes(connection.from)
      && typeof connection.to === "string" && components.includes(connection.to)
      && connection.from !== connection.to;
  });
  if (connections.length !== rawConnections.length) return null;
  if (new Set(connections.map(({ from, to }) => `${from}:${to}`)).size !== connections.length) return null;

  return { components, rules, scenario: state.scenario, connections };
}

type ScenarioRequirement = Readonly<{
  id: (typeof finalDesignScenarioIds)[number];
  label: string;
  successExplanation: string;
  components: readonly string[];
  policies: readonly string[];
  connections: readonly Readonly<{ from: string; to: string }>[];
}>;

const scenarioRequirements: readonly ScenarioRequirement[] = Object.freeze([
  { id: "db-primary", label: "Primary database failure", successExplanation: "Транзакційні дані мають failover, recovery point і безпечний шлях повторної обробки.", components: ["postgres", "read-replicas", "job-queue"], policies: ["multi-az-failover", "pitr-rpo-rto", "retry-dlq"], connections: [{ from: "postgres", to: "read-replicas" }] },
  { id: "api-instance", label: "API instance failure", successExplanation: "Load Balancer прибирає unhealthy instance, а stateless API продовжує обробку на інших replicas.", components: ["load-balancer", "api-cluster"], policies: ["api-independent", "resilience-guards"], connections: [{ from: "load-balancer", to: "api-cluster" }] },
  { id: "redis-outage", label: "Redis outage", successExplanation: "Відмова cache не зупиняє core flow: guards обмежують помилки, а система переходить у degraded mode.", components: ["api-cluster", "redis", "postgres"], policies: ["resilience-guards", "degraded-mode"], connections: [{ from: "api-cluster", to: "redis" }, { from: "api-cluster", to: "postgres" }] },
  { id: "region-outage", label: "Primary region outage", successExplanation: "Warm standby і recovery objectives задають перевірний regional failover без невизначеної втрати даних.", components: ["cdn", "postgres", "object-storage"], policies: ["warm-standby", "pitr-rpo-rto", "multi-az-failover"], connections: [{ from: "cdn", to: "frontend" }] },
  { id: "traffic-spike", label: "Traffic spike / overload", successExplanation: "Черга поглинає spike, а API і workers масштабуються незалежно без виконання довгих audit jobs у HTTP request.", components: ["load-balancer", "api-cluster", "job-queue", "worker-cluster"], policies: ["api-independent", "workers-independent", "async-reports"], connections: [{ from: "load-balancer", to: "api-cluster" }, { from: "api-cluster", to: "job-queue" }, { from: "job-queue", to: "worker-cluster" }] },
]);

export const finalDesignRequiredConnections = Object.freeze(
  [...new Map(scenarioRequirements.flatMap((scenario) => scenario.connections).map((connection) => [`${connection.from}:${connection.to}`, connection])).values()],
);

function missingComponents(state: FinalDesignState, required: readonly string[]) {
  return required.filter((id) => !state.components.includes(id));
}

function missingPolicies(state: FinalDesignState, required: readonly string[]) {
  return required.filter((id) => !state.rules.some((rule) => rule.id === id && rule.value === id));
}

function missingConnections(state: FinalDesignState, required: readonly Readonly<{ from: string; to: string }>[]) {
  return required.filter((edge) => !state.connections.some((connection) => connection.from === edge.from && connection.to === edge.to));
}

export function validateFinalDesign(state: FinalDesignState) {
  const orderedScenarios = [...scenarioRequirements].sort((left, right) => Number(right.id === state.scenario) - Number(left.id === state.scenario));
  const scenarios = orderedScenarios.map((scenario) => {
    const componentIds = missingComponents(state, scenario.components);
    const policyIds = missingPolicies(state, scenario.policies);
    const missingEdges = missingConnections(state, scenario.connections);
    const checks = [
      { id: `${scenario.id}-components`, label: "Необхідні компоненти", passed: componentIds.length === 0, explanation: componentIds.length === 0 ? "Усі компоненти recovery path присутні." : "Сценарій не має повного recovery path.", remediation: componentIds.length === 0 ? null : "Додай відсутні компоненти до схеми.", affectedIds: componentIds },
      { id: `${scenario.id}-policies`, label: "Reliability policies", passed: policyIds.length === 0, explanation: policyIds.length === 0 ? "Policies явно визначають поведінку під час відмови." : "Поведінка системи під час відмови не визначена повністю.", remediation: policyIds.length === 0 ? null : "Увімкни policies, потрібні для цього failure mode.", affectedIds: policyIds },
      { id: `${scenario.id}-flow`, label: "Data та failover flow", passed: missingEdges.length === 0, explanation: missingEdges.length === 0 ? "Потрібні connections утворюють перевірний flow." : "Компоненти є, але між ними немає необхідного напрямленого connection.", remediation: missingEdges.length === 0 ? null : `Додай connection: ${missingEdges.map(({ from, to }) => `${from} → ${to}`).join(", ")}.`, affectedIds: [...new Set(missingEdges.flatMap(({ from, to }) => [from, to]))] },
    ] as const;
    const passed = checks.every((check) => check.passed);
    return { id: scenario.id, label: scenario.label, passed, explanation: passed ? scenario.successExplanation : `Система не переживає сценарій «${scenario.label}», доки не виправлені всі перевірки.`, checks };
  });
  const allChecks = scenarios.flatMap((scenario) => scenario.checks);
  const passed = allChecks.filter((check) => check.passed).length;
  const failedScenario = scenarios.find((scenario) => !scenario.passed);
  const affectedIds = [...new Set(allChecks.filter((check) => !check.passed).flatMap((check) => check.affectedIds))];
  const valid = passed === allChecks.length;
  return {
    valid,
    code: valid ? "final-system-design-valid" : failedScenario ? `${failedScenario.id}-scenario-failed` : "final-system-design-incomplete",
    message: valid ? "Архітектура пройшла всі failure та overload scenarios." : `Пройдено ${passed} із ${allChecks.length} перевірок. Почни зі сценарію «${failedScenario?.label ?? "невідомий"}».`,
    affectedIds,
    score: { passed, total: allChecks.length, percent: Math.round((passed / allChecks.length) * 100) },
    scenarios,
  } as const;
}

export function evaluateFinalDesign(state: FinalDesignState) {
  const result = validateFinalDesign(state);
  return { code: result.code, score: result.score.percent };
}
