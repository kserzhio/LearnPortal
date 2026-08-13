import assert from "node:assert/strict";
import { getCourseLessons } from "../src/content/courses";
import { getContentSkills, getSkillMappings, skillContentCatalog, skillTaxonomy } from "../src/features/skills/content/skill-taxonomy-registry";
import { parseSkillTaxonomy, parseSkillTaxonomyJson, serializeSkillTaxonomy } from "../src/features/skills/domain/skill-taxonomy-model";

type MutableTaxonomy = {
  schema: string; schemaVersion: number; contentVersion: number;
  skills: Array<{ id:string; slug:string; title:string; description:string; category:string; parentId:string|null }>;
  mappings: Array<{ id:string; skillId:string; content:{ catalog:"adult"|"kids"; courseId:string; contentType:"course"|"unit"; contentId:string|null } }>;
};
const clone = () => JSON.parse(serializeSkillTaxonomy(skillTaxonomy)) as MutableTaxonomy;
const issueCodes = (value: MutableTaxonomy) => { const result = parseSkillTaxonomy(value, skillContentCatalog); return result.success ? [] : result.issues.map((issue) => issue.code); };

assert.equal(skillTaxonomy.schemaVersion, 1);
assert.equal(skillTaxonomy.skills.length, 10);
assert.equal(Object.isFrozen(skillTaxonomy.skills), true);
assert.equal(parseSkillTaxonomyJson(serializeSkillTaxonomy(skillTaxonomy), skillContentCatalog).success, true);

const sharedMappings = getSkillMappings("systems-thinking");
assert.deepEqual(new Set(sharedMappings.map((mapping) => mapping.content.courseId)), new Set(["high-load-architecture", "robot-quest-algorithms"]), "One skill must be reusable across courses and audiences");
const lessonSkills = getContentSkills({ catalog:"adult", courseId:"high-load-architecture", contentType:"unit", contentId:"high-load-01" });
assert.deepEqual(new Set(lessonSkills.map((skill) => skill.id)), new Set(["capacity-planning", "reliability-engineering"]), "One lesson must support multiple skills");
const highLoadLessonIds = new Set(getCourseLessons("high-load-architecture").map((lesson) => lesson.id));
const mappedHighLoadLessonIds = new Set(skillTaxonomy.mappings.filter((mapping) => mapping.content.catalog === "adult" && mapping.content.courseId === "high-load-architecture" && mapping.content.contentType === "unit").map((mapping) => mapping.content.contentId));
assert.deepEqual(mappedHighLoadLessonIds, highLoadLessonIds, "Every High Load lesson must map to at least one skill");
assert.equal(skillTaxonomy.skills.every((skill) => getSkillMappings(skill.id).length > 0), true, "Every authored skill must map to content");

const cycle = clone(); cycle.skills[0].parentId = "requirements-engineering";
assert.ok(issueCodes(cycle).includes("skill-cycle"));
const orphanParent = clone(); orphanParent.skills[1].parentId = "missing-parent";
assert.ok(issueCodes(orphanParent).includes("orphan-parent"));
const orphanSkill = clone(); orphanSkill.mappings[0].skillId = "missing-skill";
assert.ok(issueCodes(orphanSkill).includes("orphan-skill-mapping"));
const orphanUnit = clone(); orphanUnit.mappings.find((mapping) => mapping.content.contentType === "unit")!.content.contentId = "missing-unit";
assert.ok(issueCodes(orphanUnit).includes("orphan-unit-mapping"));
const unknownCourse = clone(); unknownCourse.mappings[0].content.courseId = "missing-course";
assert.ok(issueCodes(unknownCourse).includes("unknown-course"));
const duplicateMapping = clone(); duplicateMapping.mappings.push({ ...duplicateMapping.mappings[0], id:"duplicate-reference" });
assert.ok(issueCodes(duplicateMapping).includes("duplicate-content-mapping"));
const badVersion = clone(); badVersion.schemaVersion = 2;
assert.ok(issueCodes(badVersion).includes("unsupported-schema-version"));
assert.equal(parseSkillTaxonomyJson("{", skillContentCatalog).success, false);

console.log("Skill taxonomy check passed: High Load tree, shared/multi-skill mappings, round-trip, cycles and orphan guards.");
