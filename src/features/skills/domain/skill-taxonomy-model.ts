export const SKILL_TAXONOMY_SCHEMA = "systema.skill-taxonomy" as const;
export const SKILL_TAXONOMY_SCHEMA_VERSION = 1 as const;

const STABLE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_TEXT_LENGTH = 300;
const MAX_ITEMS = 500;

export type SkillCatalogKind = "adult" | "kids";
export type SkillContentType = "course" | "unit";

export type SkillNode = Readonly<{
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  parentId: string | null;
}>;

export type SkillContentReference = Readonly<{
  catalog: SkillCatalogKind;
  courseId: string;
  contentType: SkillContentType;
  contentId: string | null;
}>;

export type SkillMapping = Readonly<{
  id: string;
  skillId: string;
  content: SkillContentReference;
}>;

export type SkillTaxonomy = Readonly<{
  schema: typeof SKILL_TAXONOMY_SCHEMA;
  schemaVersion: typeof SKILL_TAXONOMY_SCHEMA_VERSION;
  contentVersion: number;
  skills: readonly SkillNode[];
  mappings: readonly SkillMapping[];
}>;

export type SkillContentCatalog = Readonly<Record<SkillCatalogKind, readonly Readonly<{
  courseId: string;
  unitIds: readonly string[];
}>[]>>;

export type SkillTaxonomyIssue = Readonly<{ code: string; path: string; message: string }>;
export type SkillTaxonomyParseResult = Readonly<{ success: true; data: SkillTaxonomy }> | Readonly<{ success: false; issues: readonly SkillTaxonomyIssue[] }>;

export class SkillTaxonomyConfigurationError extends Error {
  readonly issues: readonly SkillTaxonomyIssue[];
  constructor(issues: readonly SkillTaxonomyIssue[]) {
    super(issues.map((entry) => `${entry.path}: ${entry.message}`).join("\n"));
    this.name = "SkillTaxonomyConfigurationError";
    this.issues = issues;
  }
}

type UnknownRecord = Record<string, unknown>;
function addIssue(issues: SkillTaxonomyIssue[], code: string, path: string, message: string) { issues.push({ code, path, message }); }
function readRecord(value: unknown, path: string, keys: readonly string[], issues: SkillTaxonomyIssue[]): UnknownRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) { addIssue(issues, "expected-object", path, "Очікується object."); return {}; }
  const record = value as UnknownRecord;
  Object.keys(record).filter((key) => !keys.includes(key)).forEach((key) => addIssue(issues, "unknown-field", `${path}.${key}`, "Поле не підтримується."));
  return record;
}
function readArray(value: unknown, path: string, issues: SkillTaxonomyIssue[]) {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_ITEMS) { addIssue(issues, "invalid-array", path, `Потрібно від 1 до ${MAX_ITEMS} items.`); return Array.isArray(value) ? value.slice(0, MAX_ITEMS) : []; }
  return value;
}
function readString(value: unknown, path: string, issues: SkillTaxonomyIssue[], stable = false) {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > MAX_TEXT_LENGTH || (stable && !STABLE_ID.test(value))) {
    addIssue(issues, stable ? "invalid-stable-id" : "invalid-text", path, stable ? "Потрібен stable kebab-case ID." : "Потрібен непорожній короткий текст.");
    return "invalid";
  }
  return value;
}
function readEnum<T extends string>(value: unknown, path: string, values: readonly T[], issues: SkillTaxonomyIssue[]) {
  if (typeof value !== "string" || !values.includes(value as T)) { addIssue(issues, "invalid-enum", path, `Дозволено: ${values.join(", ")}.`); return values[0]; }
  return value as T;
}
function deepFreeze<T>(value: T): T { if (value && typeof value === "object" && !Object.isFrozen(value)) { Object.freeze(value); Object.values(value as Record<string, unknown>).forEach(deepFreeze); } return value; }

function parseSkill(value: unknown, index: number, issues: SkillTaxonomyIssue[]): SkillNode {
  const path = `$.skills[${index}]`;
  const source = readRecord(value, path, ["id", "slug", "title", "description", "category", "parentId"], issues);
  const parentId = source.parentId === null ? null : readString(source.parentId, `${path}.parentId`, issues, true);
  return { id: readString(source.id, `${path}.id`, issues, true), slug: readString(source.slug, `${path}.slug`, issues, true), title: readString(source.title, `${path}.title`, issues), description: readString(source.description, `${path}.description`, issues), category: readString(source.category, `${path}.category`, issues, true), parentId };
}

function parseMapping(value: unknown, index: number, issues: SkillTaxonomyIssue[]): SkillMapping {
  const path = `$.mappings[${index}]`;
  const source = readRecord(value, path, ["id", "skillId", "content"], issues);
  const content = readRecord(source.content, `${path}.content`, ["catalog", "courseId", "contentType", "contentId"], issues);
  const contentType = readEnum(content.contentType, `${path}.content.contentType`, ["course", "unit"] as const, issues);
  let contentId: string | null = null;
  if (contentType === "unit") contentId = readString(content.contentId, `${path}.content.contentId`, issues, true);
  else if (content.contentId !== null) addIssue(issues, "course-content-id", `${path}.content.contentId`, "Course mapping повинен мати contentId: null.");
  return { id: readString(source.id, `${path}.id`, issues, true), skillId: readString(source.skillId, `${path}.skillId`, issues, true), content: { catalog: readEnum(content.catalog, `${path}.content.catalog`, ["adult", "kids"] as const, issues), courseId: readString(content.courseId, `${path}.content.courseId`, issues, true), contentType, contentId } };
}

function validateCycles(skills: readonly SkillNode[], issues: SkillTaxonomyIssue[]) {
  const parents = new Map(skills.map((skill) => [skill.id, skill.parentId]));
  for (const [index, skill] of skills.entries()) {
    const seen = new Set<string>([skill.id]);
    let parentId = skill.parentId;
    while (parentId) {
      if (seen.has(parentId)) { addIssue(issues, "skill-cycle", `$.skills[${index}].parentId`, `Hierarchy містить cycle через ${parentId}.`); break; }
      seen.add(parentId);
      parentId = parents.get(parentId) ?? null;
    }
  }
}

export function parseSkillTaxonomy(value: unknown, catalog: SkillContentCatalog): SkillTaxonomyParseResult {
  const issues: SkillTaxonomyIssue[] = [];
  const source = readRecord(value, "$", ["schema", "schemaVersion", "contentVersion", "skills", "mappings"], issues);
  if (source.schema !== SKILL_TAXONOMY_SCHEMA) addIssue(issues, "invalid-schema", "$.schema", `Очікується ${SKILL_TAXONOMY_SCHEMA}.`);
  if (source.schemaVersion !== SKILL_TAXONOMY_SCHEMA_VERSION) addIssue(issues, "unsupported-schema-version", "$.schemaVersion", `Підтримується version ${SKILL_TAXONOMY_SCHEMA_VERSION}.`);
  if (!Number.isInteger(source.contentVersion) || (source.contentVersion as number) < 1) addIssue(issues, "invalid-version", "$.contentVersion", "Потрібне додатне ціле число.");
  const skills = readArray(source.skills, "$.skills", issues).map((entry, index) => parseSkill(entry, index, issues));
  const mappings = readArray(source.mappings, "$.mappings", issues).map((entry, index) => parseMapping(entry, index, issues));
  const skillIds = new Set<string>(); const slugs = new Set<string>();
  skills.forEach((skill, index) => {
    if (skillIds.has(skill.id)) addIssue(issues, "duplicate-skill-id", `$.skills[${index}].id`, `Skill ${skill.id} повторюється.`); skillIds.add(skill.id);
    if (slugs.has(skill.slug)) addIssue(issues, "duplicate-skill-slug", `$.skills[${index}].slug`, `Slug ${skill.slug} повторюється.`); slugs.add(skill.slug);
  });
  skills.forEach((skill, index) => { if (skill.parentId && !skillIds.has(skill.parentId)) addIssue(issues, "orphan-parent", `$.skills[${index}].parentId`, `Parent ${skill.parentId} не існує.`); });
  validateCycles(skills, issues);
  const mappingIds = new Set<string>(); const mappingKeys = new Set<string>();
  mappings.forEach((mapping, index) => {
    if (mappingIds.has(mapping.id)) addIssue(issues, "duplicate-mapping-id", `$.mappings[${index}].id`, `Mapping ${mapping.id} повторюється.`); mappingIds.add(mapping.id);
    if (!skillIds.has(mapping.skillId)) addIssue(issues, "orphan-skill-mapping", `$.mappings[${index}].skillId`, `Skill ${mapping.skillId} не існує.`);
    const course = catalog[mapping.content.catalog].find((entry) => entry.courseId === mapping.content.courseId);
    if (!course) addIssue(issues, "unknown-course", `$.mappings[${index}].content.courseId`, `Course ${mapping.content.courseId} відсутній у catalog.`);
    if (course && mapping.content.contentType === "unit" && !course.unitIds.includes(mapping.content.contentId ?? "")) addIssue(issues, "orphan-unit-mapping", `$.mappings[${index}].content.contentId`, `Unit ${mapping.content.contentId} відсутня у course ${mapping.content.courseId}.`);
    const mappingKey = `${mapping.skillId}:${mapping.content.catalog}:${mapping.content.courseId}:${mapping.content.contentType}:${mapping.content.contentId ?? "course"}`;
    if (mappingKeys.has(mappingKey)) addIssue(issues, "duplicate-content-mapping", `$.mappings[${index}]`, "Однаковий skill-to-content mapping повторюється."); mappingKeys.add(mappingKey);
  });
  const taxonomy: SkillTaxonomy = { schema: SKILL_TAXONOMY_SCHEMA, schemaVersion: SKILL_TAXONOMY_SCHEMA_VERSION, contentVersion: Number.isInteger(source.contentVersion) ? source.contentVersion as number : 1, skills, mappings };
  return issues.length ? { success: false, issues: Object.freeze(issues) } : { success: true, data: deepFreeze(taxonomy) };
}

export function defineSkillTaxonomy(value: unknown, catalog: SkillContentCatalog) { const parsed = parseSkillTaxonomy(value, catalog); if (!parsed.success) throw new SkillTaxonomyConfigurationError(parsed.issues); return parsed.data; }
export function serializeSkillTaxonomy(taxonomy: SkillTaxonomy) { return JSON.stringify(taxonomy); }
export function parseSkillTaxonomyJson(value: string, catalog: SkillContentCatalog): SkillTaxonomyParseResult { try { return parseSkillTaxonomy(JSON.parse(value), catalog); } catch { return { success: false, issues: Object.freeze([{ code: "invalid-json", path: "$", message: "Некоректний JSON." }]) }; } }
