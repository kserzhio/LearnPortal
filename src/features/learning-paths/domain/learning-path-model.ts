export const LEARNING_PATH_SCHEMA = "systema.learning-path" as const;
export const LEARNING_PATH_SCHEMA_VERSION = 1 as const;

const STABLE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_TEXT_LENGTH = 500;
const MAX_STEPS = 50;

export type LearningPathAudience = "adult" | "kids" | "mixed";
export type LearningPathStatus = "draft" | "published" | "archived";
export type LearningPathRequirement = "required" | "optional";
export type CourseCatalogKind = "adult" | "kids";

export type LearningPathCourseReference = Readonly<{
  catalog: CourseCatalogKind;
  courseId: string;
}>;

export type LearningPathStep = Readonly<{
  id: string;
  position: number;
  title: string;
  outcome: string;
  requirement: LearningPathRequirement;
  course: LearningPathCourseReference;
}>;

export type LearningPath = Readonly<{
  schema: typeof LEARNING_PATH_SCHEMA;
  schemaVersion: typeof LEARNING_PATH_SCHEMA_VERSION;
  contentVersion: number;
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  outcome: string;
  audience: LearningPathAudience;
  status: LearningPathStatus;
  duration: Readonly<{
    estimatedHours: number;
    recommendedWeeks: number;
  }>;
  steps: readonly LearningPathStep[];
}>;

export type LearningPathCourseCatalog = Readonly<{
  adult: readonly string[];
  kids: readonly string[];
}>;

export type LearningPathIssue = Readonly<{
  code: string;
  path: string;
  message: string;
}>;

export type LearningPathParseResult =
  | Readonly<{ success: true; data: LearningPath }>
  | Readonly<{ success: false; issues: readonly LearningPathIssue[] }>;

export class LearningPathConfigurationError extends Error {
  readonly issues: readonly LearningPathIssue[];

  constructor(issues: readonly LearningPathIssue[]) {
    super(issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n"));
    this.name = "LearningPathConfigurationError";
    this.issues = issues;
  }
}

type UnknownRecord = Record<string, unknown>;

function issue(issues: LearningPathIssue[], code: string, path: string, message: string) {
  issues.push({ code, path, message });
}

function record(value: unknown, path: string, allowedKeys: readonly string[], issues: LearningPathIssue[]): UnknownRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    issue(issues, "expected-object", path, "Очікується object.");
    return {};
  }
  const source = value as UnknownRecord;
  for (const key of Object.keys(source)) {
    if (!allowedKeys.includes(key)) issue(issues, "unknown-field", `${path}.${key}`, "Поле не підтримується.");
  }
  return source;
}

function stringValue(value: unknown, path: string, issues: LearningPathIssue[], stableId = false) {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > MAX_TEXT_LENGTH) {
    issue(issues, stableId ? "invalid-id" : "invalid-text", path, stableId ? "Потрібен stable kebab-case ID." : "Потрібен непорожній текст.");
    return "invalid";
  }
  if (stableId && !STABLE_ID.test(value)) {
    issue(issues, "invalid-id", path, "Потрібен stable kebab-case ID.");
    return "invalid";
  }
  return value;
}

function integer(value: unknown, path: string, issues: LearningPathIssue[], minimum = 1, maximum = Number.MAX_SAFE_INTEGER) {
  if (!Number.isInteger(value) || (value as number) < minimum || (value as number) > maximum) {
    issue(issues, "invalid-integer", path, `Очікується ціле число від ${minimum} до ${maximum}.`);
    return minimum;
  }
  return value as number;
}

function enumValue<T extends string>(value: unknown, path: string, values: readonly T[], issues: LearningPathIssue[]) {
  if (typeof value !== "string" || !values.includes(value as T)) {
    issue(issues, "invalid-enum", path, `Дозволені значення: ${values.join(", ")}.`);
    return values[0];
  }
  return value as T;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value as Record<string, unknown>).forEach(deepFreeze);
  }
  return value;
}

function parseStep(value: unknown, index: number, audience: LearningPathAudience, catalogs: LearningPathCourseCatalog, issues: LearningPathIssue[]): LearningPathStep {
  const path = `$.steps[${index}]`;
  const source = record(value, path, ["id", "position", "title", "outcome", "requirement", "course"], issues);
  const courseSource = record(source.course, `${path}.course`, ["catalog", "courseId"], issues);
  const catalog = enumValue(courseSource.catalog, `${path}.course.catalog`, ["adult", "kids"] as const, issues);
  const courseId = stringValue(courseSource.courseId, `${path}.course.courseId`, issues, true);

  if (audience !== "mixed" && catalog !== audience) {
    issue(issues, "audience-course-mismatch", `${path}.course.catalog`, `Path для аудиторії ${audience} не може містити ${catalog} course.`);
  }
  if (!catalogs[catalog].includes(courseId)) {
    issue(issues, "unknown-course", `${path}.course.courseId`, `Course ${courseId} відсутній у catalog ${catalog}.`);
  }

  return {
    id: stringValue(source.id, `${path}.id`, issues, true),
    position: integer(source.position, `${path}.position`, issues, 1, MAX_STEPS),
    title: stringValue(source.title, `${path}.title`, issues),
    outcome: stringValue(source.outcome, `${path}.outcome`, issues),
    requirement: enumValue(source.requirement, `${path}.requirement`, ["required", "optional"] as const, issues),
    course: { catalog, courseId },
  };
}

export function parseLearningPath(value: unknown, catalogs: LearningPathCourseCatalog): LearningPathParseResult {
  const issues: LearningPathIssue[] = [];
  const source = record(value, "$", [
    "schema", "schemaVersion", "contentVersion", "id", "slug", "title", "shortDescription", "outcome",
    "audience", "status", "duration", "steps",
  ], issues);

  if (source.schema !== LEARNING_PATH_SCHEMA) issue(issues, "invalid-schema", "$.schema", `Очікується ${LEARNING_PATH_SCHEMA}.`);
  if (source.schemaVersion !== LEARNING_PATH_SCHEMA_VERSION) issue(issues, "unsupported-schema-version", "$.schemaVersion", `Підтримується schema version ${LEARNING_PATH_SCHEMA_VERSION}.`);

  const audience = enumValue(source.audience, "$.audience", ["adult", "kids", "mixed"] as const, issues);
  const durationSource = record(source.duration, "$.duration", ["estimatedHours", "recommendedWeeks"], issues);
  const rawSteps = Array.isArray(source.steps) ? source.steps : [];
  if (!Array.isArray(source.steps) || rawSteps.length === 0 || rawSteps.length > MAX_STEPS) {
    issue(issues, "invalid-step-count", "$.steps", `Path повинен мати від 1 до ${MAX_STEPS} кроків.`);
  }
  const steps = rawSteps.slice(0, MAX_STEPS).map((step, index) => parseStep(step, index, audience, catalogs, issues));

  const stepIds = new Set<string>();
  const courseKeys = new Set<string>();
  for (const [index, step] of steps.entries()) {
    if (step.position !== index + 1) issue(issues, "unstable-step-order", `$.steps[${index}].position`, "Позиції мають бути безперервними й відповідати порядку масиву.");
    if (stepIds.has(step.id)) issue(issues, "duplicate-step-id", `$.steps[${index}].id`, `Step ID ${step.id} повторюється.`);
    stepIds.add(step.id);
    const courseKey = `${step.course.catalog}:${step.course.courseId}`;
    if (courseKeys.has(courseKey)) issue(issues, "duplicate-course-reference", `$.steps[${index}].course`, `Course ${step.course.courseId} уже є в path.`);
    courseKeys.add(courseKey);
  }
  if (steps.length > 0 && !steps.some((step) => step.requirement === "required")) {
    issue(issues, "missing-required-step", "$.steps", "Path повинен містити хоча б один required step.");
  }

  const path: LearningPath = {
    schema: LEARNING_PATH_SCHEMA,
    schemaVersion: LEARNING_PATH_SCHEMA_VERSION,
    contentVersion: integer(source.contentVersion, "$.contentVersion", issues),
    id: stringValue(source.id, "$.id", issues, true),
    slug: stringValue(source.slug, "$.slug", issues, true),
    title: stringValue(source.title, "$.title", issues),
    shortDescription: stringValue(source.shortDescription, "$.shortDescription", issues),
    outcome: stringValue(source.outcome, "$.outcome", issues),
    audience,
    status: enumValue(source.status, "$.status", ["draft", "published", "archived"] as const, issues),
    duration: {
      estimatedHours: integer(durationSource.estimatedHours, "$.duration.estimatedHours", issues, 1, 10_000),
      recommendedWeeks: integer(durationSource.recommendedWeeks, "$.duration.recommendedWeeks", issues, 1, 520),
    },
    steps,
  };

  return issues.length > 0
    ? { success: false, issues: Object.freeze([...issues]) }
    : { success: true, data: deepFreeze(path) };
}

export function defineLearningPath(value: unknown, catalogs: LearningPathCourseCatalog): LearningPath {
  const parsed = parseLearningPath(value, catalogs);
  if (!parsed.success) throw new LearningPathConfigurationError(parsed.issues);
  return parsed.data;
}

export function serializeLearningPath(path: LearningPath) {
  return JSON.stringify(path);
}

export function parseLearningPathJson(value: string, catalogs: LearningPathCourseCatalog): LearningPathParseResult {
  try {
    return parseLearningPath(JSON.parse(value), catalogs);
  } catch {
    return { success: false, issues: Object.freeze([{ code: "invalid-json", path: "$", message: "Некоректний JSON." }]) };
  }
}
