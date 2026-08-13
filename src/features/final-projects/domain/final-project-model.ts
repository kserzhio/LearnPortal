export const FINAL_PROJECT_SCHEMA = "systema.final-project" as const;
export const FINAL_PROJECT_SCHEMA_VERSION = 1 as const;

const STABLE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_TEXT_LENGTH = 1_000;
const MAX_LIST_ITEMS = 50;
const MAX_JSON_DEPTH = 20;

export type FinalProjectCatalogKind = "adult" | "kids";
export type FinalProjectStatus = "draft" | "published" | "archived";
export type FinalProjectRequirementPriority = "must" | "should";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | readonly JsonValue[] | Readonly<{ [key: string]: JsonValue }>;

export type FinalProjectRequirement = Readonly<{
  id: string;
  title: string;
  description: string;
  priority: FinalProjectRequirementPriority;
}>;

export type FinalProjectConstraint = Readonly<{
  id: string;
  label: string;
  value: string;
  description: string;
}>;

export type FinalProjectSuccessCriterion = Readonly<{
  id: string;
  title: string;
  description: string;
}>;

export type FinalProjectBuilderComponent = Readonly<{
  id: string;
  label: string;
  description: string;
  category: "edge" | "compute" | "data" | "processing" | "integration";
}>;

export type FinalProjectBuilderPolicy = Readonly<{
  id: string;
  label: string;
  description: string;
}>;

export type FinalProjectBuilderScenario = Readonly<{
  id: string;
  label: string;
  description: string;
}>;

export type FinalProject = Readonly<{
  schema: typeof FINAL_PROJECT_SCHEMA;
  schemaVersion: typeof FINAL_PROJECT_SCHEMA_VERSION;
  contentVersion: number;
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  outcome: string;
  course: Readonly<{ catalog: FinalProjectCatalogKind; courseId: string }>;
  status: FinalProjectStatus;
  estimatedMinutes: number;
  access: Readonly<{ guestPreview: boolean }>;
  scenario: Readonly<{
    title: string;
    summary: string;
    assumptions: readonly string[];
  }>;
  requirements: readonly FinalProjectRequirement[];
  constraints: readonly FinalProjectConstraint[];
  successCriteria: readonly FinalProjectSuccessCriterion[];
  builder: Readonly<{
    version: number;
    components: readonly FinalProjectBuilderComponent[];
    policies: readonly FinalProjectBuilderPolicy[];
    scenarios: readonly FinalProjectBuilderScenario[];
    maxConnections: number;
  }>;
  starterScenario: Readonly<{
    version: number;
    simulatorId: string;
    simulatorSchemaVersion: number;
    textDescription: string;
    state: JsonValue;
  }>;
  validator: Readonly<{
    id: string;
    version: number;
    resultVersion: number;
  }>;
}>;

export type FinalProjectValidationResult = Readonly<{
  valid: boolean;
  code: string;
  message: string;
  affectedIds: readonly string[];
  score: Readonly<{ passed: number; total: number; percent: number }>;
  scenarios: readonly Readonly<{
    id: string;
    label: string;
    passed: boolean;
    explanation: string;
    checks: readonly Readonly<{
      id: string;
      label: string;
      passed: boolean;
      explanation: string;
      remediation: string | null;
      affectedIds: readonly string[];
    }>[];
  }>[];
}>;

export type FinalProjectValidatorDescriptor = Readonly<{
  id: string;
  version: number;
  resultVersion: number;
  simulatorId: string;
  simulatorSchemaVersion: number;
  persistenceLessonId: string | null;
  parseState: (value: unknown) => unknown | null;
  validateState: (value: unknown) => FinalProjectValidationResult | null;
}>;

export type FinalProjectCatalog = Readonly<{
  courses: Readonly<Record<FinalProjectCatalogKind, readonly string[]>>;
  validators: readonly FinalProjectValidatorDescriptor[];
}>;

export type FinalProjectIssue = Readonly<{ code: string; path: string; message: string }>;
export type FinalProjectParseResult =
  | Readonly<{ success: true; data: FinalProject }>
  | Readonly<{ success: false; issues: readonly FinalProjectIssue[] }>;

export class FinalProjectConfigurationError extends Error {
  readonly issues: readonly FinalProjectIssue[];

  constructor(issues: readonly FinalProjectIssue[]) {
    super(issues.map((entry) => `${entry.path}: ${entry.message}`).join("\n"));
    this.name = "FinalProjectConfigurationError";
    this.issues = issues;
  }
}

type UnknownRecord = Record<string, unknown>;

function addIssue(issues: FinalProjectIssue[], code: string, path: string, message: string) {
  issues.push({ code, path, message });
}

function readRecord(value: unknown, path: string, keys: readonly string[], issues: FinalProjectIssue[]): UnknownRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    addIssue(issues, "expected-object", path, "Очікується object.");
    return {};
  }
  const source = value as UnknownRecord;
  Object.keys(source).filter((key) => !keys.includes(key)).forEach((key) => {
    addIssue(issues, "unknown-field", `${path}.${key}`, "Поле не підтримується.");
  });
  return source;
}

function readString(value: unknown, path: string, issues: FinalProjectIssue[], stable = false) {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > MAX_TEXT_LENGTH || (stable && !STABLE_ID.test(value))) {
    addIssue(issues, stable ? "invalid-stable-id" : "invalid-text", path, stable ? "Потрібен stable kebab-case ID." : "Потрібен непорожній текст.");
    return "invalid";
  }
  return value;
}

function readInteger(value: unknown, path: string, issues: FinalProjectIssue[], maximum = Number.MAX_SAFE_INTEGER) {
  if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > maximum) {
    addIssue(issues, "invalid-integer", path, `Очікується ціле число від 1 до ${maximum}.`);
    return 1;
  }
  return value as number;
}

function readBoolean(value: unknown, path: string, issues: FinalProjectIssue[]) {
  if (typeof value !== "boolean") {
    addIssue(issues, "invalid-boolean", path, "Очікується boolean.");
    return false;
  }
  return value;
}

function readEnum<T extends string>(value: unknown, path: string, values: readonly T[], issues: FinalProjectIssue[]) {
  if (typeof value !== "string" || !values.includes(value as T)) {
    addIssue(issues, "invalid-enum", path, `Дозволено: ${values.join(", ")}.`);
    return values[0];
  }
  return value as T;
}

function readArray(value: unknown, path: string, issues: FinalProjectIssue[]) {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_LIST_ITEMS) {
    addIssue(issues, "invalid-array", path, `Потрібно від 1 до ${MAX_LIST_ITEMS} items.`);
    return Array.isArray(value) ? value.slice(0, MAX_LIST_ITEMS) : [];
  }
  return value;
}

function readTextList(value: unknown, path: string, issues: FinalProjectIssue[]) {
  return readArray(value, path, issues).map((entry, index) => readString(entry, `${path}[${index}]`, issues));
}

function readJsonValue(value: unknown, path: string, issues: FinalProjectIssue[], depth = 0): JsonValue {
  if (depth > MAX_JSON_DEPTH) {
    addIssue(issues, "json-depth-exceeded", path, `JSON state не може бути глибшим за ${MAX_JSON_DEPTH} рівнів.`);
    return null;
  }
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map((entry, index) => readJsonValue(entry, `${path}[${index}]`, issues, depth + 1));
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value as UnknownRecord).map(([key, entry]) => [key, readJsonValue(entry, `${path}.${key}`, issues, depth + 1)]));
  }
  addIssue(issues, "non-json-state", path, "Starter state має бути JSON-compatible data без executable code.");
  return null;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value as Record<string, unknown>).forEach(deepFreeze);
  }
  return value;
}

function parseRequirement(value: unknown, index: number, issues: FinalProjectIssue[]): FinalProjectRequirement {
  const path = `$.requirements[${index}]`;
  const source = readRecord(value, path, ["id", "title", "description", "priority"], issues);
  return {
    id: readString(source.id, `${path}.id`, issues, true),
    title: readString(source.title, `${path}.title`, issues),
    description: readString(source.description, `${path}.description`, issues),
    priority: readEnum(source.priority, `${path}.priority`, ["must", "should"] as const, issues),
  };
}

function parseConstraint(value: unknown, index: number, issues: FinalProjectIssue[]): FinalProjectConstraint {
  const path = `$.constraints[${index}]`;
  const source = readRecord(value, path, ["id", "label", "value", "description"], issues);
  return {
    id: readString(source.id, `${path}.id`, issues, true),
    label: readString(source.label, `${path}.label`, issues),
    value: readString(source.value, `${path}.value`, issues),
    description: readString(source.description, `${path}.description`, issues),
  };
}

function parseSuccessCriterion(value: unknown, index: number, issues: FinalProjectIssue[]): FinalProjectSuccessCriterion {
  const path = `$.successCriteria[${index}]`;
  const source = readRecord(value, path, ["id", "title", "description"], issues);
  return {
    id: readString(source.id, `${path}.id`, issues, true),
    title: readString(source.title, `${path}.title`, issues),
    description: readString(source.description, `${path}.description`, issues),
  };
}

function parseBuilderComponent(value: unknown, index: number, issues: FinalProjectIssue[]): FinalProjectBuilderComponent {
  const path = `$.builder.components[${index}]`;
  const source = readRecord(value, path, ["id", "label", "description", "category"], issues);
  return {
    id: readString(source.id, `${path}.id`, issues, true),
    label: readString(source.label, `${path}.label`, issues),
    description: readString(source.description, `${path}.description`, issues),
    category: readEnum(source.category, `${path}.category`, ["edge", "compute", "data", "processing", "integration"] as const, issues),
  };
}

function parseBuilderPolicy(value: unknown, index: number, issues: FinalProjectIssue[]): FinalProjectBuilderPolicy {
  const path = `$.builder.policies[${index}]`;
  const source = readRecord(value, path, ["id", "label", "description"], issues);
  return { id: readString(source.id, `${path}.id`, issues, true), label: readString(source.label, `${path}.label`, issues), description: readString(source.description, `${path}.description`, issues) };
}

function parseBuilderScenario(value: unknown, index: number, issues: FinalProjectIssue[]): FinalProjectBuilderScenario {
  const path = `$.builder.scenarios[${index}]`;
  const source = readRecord(value, path, ["id", "label", "description"], issues);
  return { id: readString(source.id, `${path}.id`, issues, true), label: readString(source.label, `${path}.label`, issues), description: readString(source.description, `${path}.description`, issues) };
}

function validateUniqueIds(items: readonly Readonly<{ id: string }>[], path: string, issues: FinalProjectIssue[]) {
  const ids = new Set<string>();
  items.forEach((item, index) => {
    if (ids.has(item.id)) addIssue(issues, "duplicate-item-id", `${path}[${index}].id`, `ID ${item.id} повторюється.`);
    ids.add(item.id);
  });
}

export function parseFinalProject(value: unknown, catalog: FinalProjectCatalog): FinalProjectParseResult {
  const issues: FinalProjectIssue[] = [];
  const source = readRecord(value, "$", [
    "schema", "schemaVersion", "contentVersion", "id", "slug", "title", "shortDescription", "outcome", "course",
    "status", "estimatedMinutes", "access", "scenario", "requirements", "constraints", "successCriteria", "builder", "starterScenario", "validator",
  ], issues);

  if (source.schema !== FINAL_PROJECT_SCHEMA) addIssue(issues, "invalid-schema", "$.schema", `Очікується ${FINAL_PROJECT_SCHEMA}.`);
  if (source.schemaVersion !== FINAL_PROJECT_SCHEMA_VERSION) addIssue(issues, "unsupported-schema-version", "$.schemaVersion", `Підтримується version ${FINAL_PROJECT_SCHEMA_VERSION}.`);

  const contentVersion = readInteger(source.contentVersion, "$.contentVersion", issues);
  const courseSource = readRecord(source.course, "$.course", ["catalog", "courseId"], issues);
  const courseKind = readEnum(courseSource.catalog, "$.course.catalog", ["adult", "kids"] as const, issues);
  const courseId = readString(courseSource.courseId, "$.course.courseId", issues, true);
  if (!catalog.courses[courseKind].includes(courseId)) addIssue(issues, "unknown-course", "$.course.courseId", `Course ${courseId} відсутній у catalog ${courseKind}.`);

  const accessSource = readRecord(source.access, "$.access", ["guestPreview"], issues);
  const scenarioSource = readRecord(source.scenario, "$.scenario", ["title", "summary", "assumptions"], issues);
  const starterSource = readRecord(source.starterScenario, "$.starterScenario", ["version", "simulatorId", "simulatorSchemaVersion", "textDescription", "state"], issues);
  const validatorSource = readRecord(source.validator, "$.validator", ["id", "version", "resultVersion"], issues);
  const builderSource = readRecord(source.builder, "$.builder", ["version", "components", "policies", "scenarios", "maxConnections"], issues);

  const requirements = readArray(source.requirements, "$.requirements", issues).map((entry, index) => parseRequirement(entry, index, issues));
  const constraints = readArray(source.constraints, "$.constraints", issues).map((entry, index) => parseConstraint(entry, index, issues));
  const successCriteria = readArray(source.successCriteria, "$.successCriteria", issues).map((entry, index) => parseSuccessCriterion(entry, index, issues));
  validateUniqueIds(requirements, "$.requirements", issues);
  validateUniqueIds(constraints, "$.constraints", issues);
  validateUniqueIds(successCriteria, "$.successCriteria", issues);
  const builderComponents = readArray(builderSource.components, "$.builder.components", issues).map((entry, index) => parseBuilderComponent(entry, index, issues));
  const builderPolicies = readArray(builderSource.policies, "$.builder.policies", issues).map((entry, index) => parseBuilderPolicy(entry, index, issues));
  const builderScenarios = readArray(builderSource.scenarios, "$.builder.scenarios", issues).map((entry, index) => parseBuilderScenario(entry, index, issues));
  validateUniqueIds(builderComponents, "$.builder.components", issues);
  validateUniqueIds(builderPolicies, "$.builder.policies", issues);
  validateUniqueIds(builderScenarios, "$.builder.scenarios", issues);

  const starterVersion = readInteger(starterSource.version, "$.starterScenario.version", issues);
  const builderVersion = readInteger(builderSource.version, "$.builder.version", issues);
  const simulatorId = readString(starterSource.simulatorId, "$.starterScenario.simulatorId", issues, true);
  const simulatorSchemaVersion = readInteger(starterSource.simulatorSchemaVersion, "$.starterScenario.simulatorSchemaVersion", issues);
  const validatorId = readString(validatorSource.id, "$.validator.id", issues, true);
  const validatorVersion = readInteger(validatorSource.version, "$.validator.version", issues);
  const resultVersion = readInteger(validatorSource.resultVersion, "$.validator.resultVersion", issues);
  const starterState = readJsonValue(starterSource.state, "$.starterScenario.state", issues);

  if (builderVersion !== contentVersion || starterVersion !== contentVersion || validatorVersion !== contentVersion || resultVersion !== contentVersion) {
    addIssue(issues, "incompatible-project-version", "$.validator", "Project, builder, starter scenario, validator і result мають використовувати однакову content version.");
  }

  const validator = catalog.validators.find((entry) => entry.id === validatorId && entry.version === validatorVersion);
  if (!validator) {
    addIssue(issues, "unknown-validator-version", "$.validator", `Validator ${validatorId}@${validatorVersion} не зареєстрований.`);
  } else {
    if (validator.resultVersion !== resultVersion) addIssue(issues, "incompatible-result-version", "$.validator.resultVersion", `Validator очікує result version ${validator.resultVersion}.`);
    if (validator.simulatorId !== simulatorId || validator.simulatorSchemaVersion !== simulatorSchemaVersion) {
      addIssue(issues, "incompatible-simulator-binding", "$.starterScenario", "Starter scenario не сумісний із зареєстрованим validator.");
    } else if (!validator.parseState(starterState)) {
      addIssue(issues, "invalid-starter-state", "$.starterScenario.state", "Starter state не відповідає схемі simulator.");
    }
  }

  const project: FinalProject = {
    schema: FINAL_PROJECT_SCHEMA,
    schemaVersion: FINAL_PROJECT_SCHEMA_VERSION,
    contentVersion,
    id: readString(source.id, "$.id", issues, true),
    slug: readString(source.slug, "$.slug", issues, true),
    title: readString(source.title, "$.title", issues),
    shortDescription: readString(source.shortDescription, "$.shortDescription", issues),
    outcome: readString(source.outcome, "$.outcome", issues),
    course: { catalog: courseKind, courseId },
    status: readEnum(source.status, "$.status", ["draft", "published", "archived"] as const, issues),
    estimatedMinutes: readInteger(source.estimatedMinutes, "$.estimatedMinutes", issues, 10_000),
    access: { guestPreview: readBoolean(accessSource.guestPreview, "$.access.guestPreview", issues) },
    scenario: {
      title: readString(scenarioSource.title, "$.scenario.title", issues),
      summary: readString(scenarioSource.summary, "$.scenario.summary", issues),
      assumptions: readTextList(scenarioSource.assumptions, "$.scenario.assumptions", issues),
    },
    requirements,
    constraints,
    successCriteria,
    builder: {
      version: builderVersion,
      components: builderComponents,
      policies: builderPolicies,
      scenarios: builderScenarios,
      maxConnections: readInteger(builderSource.maxConnections, "$.builder.maxConnections", issues, 500),
    },
    starterScenario: {
      version: starterVersion,
      simulatorId,
      simulatorSchemaVersion,
      textDescription: readString(starterSource.textDescription, "$.starterScenario.textDescription", issues),
      state: starterState,
    },
    validator: { id: validatorId, version: validatorVersion, resultVersion },
  };

  return issues.length > 0
    ? { success: false, issues: Object.freeze([...issues]) }
    : { success: true, data: deepFreeze(project) };
}

export function defineFinalProject(value: unknown, catalog: FinalProjectCatalog): FinalProject {
  const parsed = parseFinalProject(value, catalog);
  if (!parsed.success) throw new FinalProjectConfigurationError(parsed.issues);
  return parsed.data;
}

export function serializeFinalProject(project: FinalProject) {
  return JSON.stringify(project);
}

export function parseFinalProjectJson(value: string, catalog: FinalProjectCatalog): FinalProjectParseResult {
  try {
    return parseFinalProject(JSON.parse(value), catalog);
  } catch {
    return { success: false, issues: Object.freeze([{ code: "invalid-json", path: "$", message: "Некоректний JSON." }]) };
  }
}
