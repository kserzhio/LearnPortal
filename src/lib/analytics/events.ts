export type AnalyticsValue = string | number | boolean | null;

export type ProductAnalyticsEventMap = Readonly<{
  course_viewed: Readonly<{ course_id: string; source: string }>;
  course_started: Readonly<{ course_id: string; access: "guest" | "authenticated" }>;
  course_completed: Readonly<{ course_id: string; lesson_count: number }>;
  lesson_viewed: Readonly<{ course_id: string; content_id: string }>;
  lesson_started: Readonly<{ course_id: string; content_id: string }>;
  lesson_completed: Readonly<{ course_id: string; content_id: string }>;
  knowledge_check_submitted: Readonly<{ content_id: string; result: "correct" | "incorrect" }>;
  hint_opened: Readonly<{ content_id: string; stage: number }>;
  question_created: Readonly<{ content_id: string; question_type: string }>;
  lesson_feedback_submitted: Readonly<{ content_id: string; helpful: boolean }>;
  simulator_run: Readonly<{ content_id: string; result: "valid" | "invalid" }>;
  cta_clicked: Readonly<{ cta_id: string; surface: string }>;
  learning_path_viewed: Readonly<{ path_id: string; source: string }>;
  learning_path_started: Readonly<{ path_id: string; access: "guest" | "authenticated" }>;
  learning_path_completed: Readonly<{ path_id: string; course_count: number }>;
  skill_map_viewed: Readonly<{ view_mode: "visual" | "list"; source: string }>;
  final_project_viewed: Readonly<{ project_id: string; course_id: string; source: string }>;
  final_project_started: Readonly<{ project_id: string; course_id: string }>;
  final_project_run: Readonly<{ project_id: string; result: "valid" | "invalid" }>;
  final_project_scenario_failed: Readonly<{ project_id: string; scenario_id: string }>;
  final_project_component_added: Readonly<{ project_id: string; component_type: string }>;
  final_project_configuration_changed: Readonly<{ project_id: string; configuration_type: "policy" | "scenario" | "connection" }>;
  final_project_save_failed: Readonly<Record<string, never>>;
  final_project_completed: Readonly<{ project_id: string; scenario_count: number }>;
  completed_projects_viewed: Readonly<Record<string, never>>;
  weekly_goal_set: Readonly<{ target_lessons: number; enabled: boolean }>;
  weekly_goal_completed: Readonly<{ target_lessons: number; week_key: string }>;
  weekly_challenge_viewed: Readonly<{ challenge_id: string; source: string }>;
  weekly_challenge_started: Readonly<{ challenge_id: string; access: "guest" | "authenticated" }>;
  weekly_challenge_completed: Readonly<{ challenge_id: string; result: "success" | "retry" }>;
  public_profile_enabled: Readonly<{ enabled: boolean; source: string }>;
  public_profile_viewed: Readonly<{ profile_key: string; source: string }>;
  profile_shared: Readonly<{ channel: string; surface: string }>;
  alternative_explanation_opened: Readonly<{ content_id: string; explanation_type: "simple" | "example" }>;
  playground_opened: Readonly<{ playground_id: string; source: string }>;
  playground_run: Readonly<{ playground_id: string; result: "success" | "retry" }>;
  playground_shared: Readonly<{ playground_id: string; channel: string }>;
  recommendation_clicked: Readonly<{ source_id: string; target_id: string }>;
}>;

export type ProductAnalyticsEventName = keyof ProductAnalyticsEventMap;
export type ProductAnalyticsProperties<Name extends ProductAnalyticsEventName> = ProductAnalyticsEventMap[Name];
export type SafeAnalyticsEvent = Readonly<{ name: ProductAnalyticsEventName; properties: Readonly<Record<string, AnalyticsValue>> }>;

const eventPropertyKeys = {
  course_viewed: ["course_id", "source"], course_started: ["course_id", "access"], course_completed: ["course_id", "lesson_count"],
  lesson_viewed: ["course_id", "content_id"], lesson_started: ["course_id", "content_id"], lesson_completed: ["course_id", "content_id"],
  knowledge_check_submitted: ["content_id", "result"], hint_opened: ["content_id", "stage"], question_created: ["content_id", "question_type"],
  lesson_feedback_submitted: ["content_id", "helpful"], simulator_run: ["content_id", "result"], cta_clicked: ["cta_id", "surface"],
  learning_path_viewed: ["path_id", "source"], learning_path_started: ["path_id", "access"], learning_path_completed: ["path_id", "course_count"],
  skill_map_viewed: ["view_mode", "source"], final_project_viewed: ["project_id", "course_id", "source"], final_project_started: ["project_id", "course_id"], final_project_run: ["project_id", "result"], final_project_scenario_failed: ["project_id", "scenario_id"],
  final_project_component_added: ["project_id", "component_type"], final_project_configuration_changed: ["project_id", "configuration_type"], final_project_save_failed: [], final_project_completed: ["project_id", "scenario_count"], completed_projects_viewed: [], weekly_goal_set: ["target_lessons", "enabled"], weekly_goal_completed: ["target_lessons", "week_key"],
  weekly_challenge_viewed: ["challenge_id", "source"], weekly_challenge_started: ["challenge_id", "access"], weekly_challenge_completed: ["challenge_id", "result"],
  public_profile_enabled: ["enabled", "source"], public_profile_viewed: ["profile_key", "source"], profile_shared: ["channel", "surface"],
  alternative_explanation_opened: ["content_id", "explanation_type"], playground_opened: ["playground_id", "source"], playground_run: ["playground_id", "result"],
  playground_shared: ["playground_id", "channel"], recommendation_clicked: ["source_id", "target_id"],
} as const satisfies Record<ProductAnalyticsEventName, readonly string[]>;

const safeIdentifier = /^[a-z0-9][a-z0-9._:/-]{0,79}$/i;

function safeValue(value: unknown): value is AnalyticsValue {
  if (typeof value === "boolean" || value === null) return true;
  if (typeof value === "number") return Number.isFinite(value) && Math.abs(value) <= 1_000_000_000;
  return typeof value === "string" && safeIdentifier.test(value);
}

export function sanitizeAnalyticsEvent(name: unknown, properties: unknown): SafeAnalyticsEvent | null {
  if (typeof name !== "string" || !(name in eventPropertyKeys) || !properties || typeof properties !== "object" || Array.isArray(properties)) return null;
  const eventName = name as ProductAnalyticsEventName;
  const record = properties as Record<string, unknown>;
  const expectedKeys = eventPropertyKeys[eventName];
  if (Object.keys(record).length !== expectedKeys.length || expectedKeys.some((key) => !(key in record) || !safeValue(record[key]))) return null;
  return { name: eventName, properties: Object.fromEntries(expectedKeys.map((key) => [key, record[key] as AnalyticsValue])) };
}
