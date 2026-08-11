import { getLessons } from "@/content/course-contract";
import { highLoadArchitectureCourse } from "@/content/courses/high-load-architecture";

const finalDesignLesson = getLessons(highLoadArchitectureCourse).at(-1);
if (!finalDesignLesson) throw new Error("The final System Design lesson is missing");

export const FINAL_DESIGN_COURSE_ID = highLoadArchitectureCourse.id;
export const FINAL_DESIGN_LESSON_ID = finalDesignLesson.id;
export const FINAL_DESIGN_SIMULATOR_ID = "final-system-design";
export const FINAL_DESIGN_SCHEMA_VERSION = 1;

const componentIds = [
  "cdn", "frontend", "load-balancer", "api-cluster", "redis", "postgres", "read-replicas",
  "job-queue", "worker-cluster", "puppeteer", "axe-core", "object-storage", "notification", "status-stream",
] as const;

const ruleIds = [
  "api-independent", "workers-independent", "retry-dlq", "realtime-pubsub", "async-reports",
  "multi-az-failover", "resilience-guards", "degraded-mode", "pitr-rpo-rto", "warm-standby",
] as const;

const scenarioIds = ["db-primary", "api-instance", "redis-outage", "region-outage"] as const;
const safeValue = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type FinalDesignState = {
  components: string[];
  rules: Array<{ id: string; value: string }>;
  scenario: string;
};

export function parseFinalDesignState(value: unknown): FinalDesignState | null {
  if (!value || typeof value !== "object") return null;
  const state = value as Record<string, unknown>;
  if (!Array.isArray(state.components) || !Array.isArray(state.rules) || typeof state.scenario !== "string") return null;
  if (state.components.length > componentIds.length || state.rules.length > ruleIds.length) return null;
  if (!scenarioIds.includes(state.scenario as (typeof scenarioIds)[number])) return null;

  const components = state.components.filter((item): item is string => typeof item === "string");
  if (components.length !== state.components.length || new Set(components).size !== components.length) return null;
  if (components.some((id) => !componentIds.includes(id as (typeof componentIds)[number]))) return null;

  const rules = state.rules.filter((item): item is { id: string; value: string } => {
    if (!item || typeof item !== "object") return false;
    const rule = item as Record<string, unknown>;
    return typeof rule.id === "string"
      && ruleIds.includes(rule.id as (typeof ruleIds)[number])
      && typeof rule.value === "string"
      && (rule.value === "" || safeValue.test(rule.value));
  });
  if (rules.length !== state.rules.length || new Set(rules.map((rule) => rule.id)).size !== rules.length) return null;

  return { components, rules, scenario: state.scenario };
}

export function evaluateFinalDesign(state: FinalDesignState) {
  const componentCoverage = componentIds.filter((id) => state.components.includes(id)).length;
  const validRules = ruleIds.filter((id) => state.rules.some((rule) => rule.id === id && rule.value === id)).length;
  const score = Math.round(((componentCoverage + validRules) / (componentIds.length + ruleIds.length)) * 100);

  if (componentCoverage < componentIds.length) return { code: "missing-final-component", score };
  if (state.rules.length < ruleIds.length || state.rules.some((rule) => !rule.value)) return { code: "missing-final-policy", score };
  if (validRules < ruleIds.length) return { code: "invalid-final-policy", score };
  return { code: "final-system-design-valid", score: 100 };
}
