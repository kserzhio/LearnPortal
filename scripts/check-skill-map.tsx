import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { SkillProgressSummary } from "../src/features/skills/ui/skill-progress-summary";
import { buildSkillMapTree, getSkillCategories, resolveSkillCategoryFilter, summarizeSkillProgress } from "../src/features/skills/presentation/skill-map-model";
import { buildSkillProgress } from "../src/features/skills/progress/skill-progress";
import { skillContentCatalog, skillTaxonomy } from "../src/features/skills/content/skill-taxonomy-registry";

const progress = buildSkillProgress(skillTaxonomy, skillContentCatalog, [
  { catalog:"adult", courseId:"high-load-architecture", unitId:"high-load-01", completed:true },
  { catalog:"adult", courseId:"high-load-architecture", unitId:"high-load-03", completed:true },
]);
const categories = getSkillCategories(skillTaxonomy.skills);
assert.deepEqual(categories, ["architecture", "data", "foundation", "performance", "quality", "reliability"]);
assert.equal(resolveSkillCategoryFilter("data", categories), "data");
assert.equal(resolveSkillCategoryFilter(["quality", "data"], categories), "quality");
assert.equal(resolveSkillCategoryFilter("invalid", categories), "all");

const summary = summarizeSkillProgress(progress);
assert.equal(summary.completed, 1);
assert.ok(summary.not_started > 0);
assert.equal(summary.completed + summary.in_progress + summary.not_started, skillTaxonomy.skills.length);
const summaryHtml = renderToStaticMarkup(<SkillProgressSummary summary={summary} />);
assert.match(summaryHtml, /Огляд станів навичок/);
assert.match(summaryHtml, /Завершено/);
assert.match(summaryHtml, /У процесі/);
assert.match(renderToStaticMarkup(<SkillProgressSummary summary={summary} available={false} />), /<dd>—<\/dd>/);

const fullTree = buildSkillMapTree(progress, "all");
assert.equal(fullTree.length, 1);
assert.equal(fullTree[0].progress.skill.id, "systems-thinking");
assert.ok(fullTree[0].children.some((node) => node.progress.skill.id === "architecture-design"));
const dataTree = buildSkillMapTree(progress, "data");
assert.equal(dataTree.length, 1, "A filtered branch must preserve its root ancestor");
assert.equal(dataTree[0].contextOnly, true);
const architecture = dataTree[0].children.find((node) => node.progress.skill.id === "architecture-design");
assert.ok(architecture?.contextOnly);
assert.deepEqual(architecture.children.map((node) => node.progress.skill.id), ["data-strategy"]);
assert.equal(architecture.children[0].contextOnly, false);

console.log("Skill Map check passed: categories, URL filter, summary, full hierarchy and ancestor-preserving filtered tree.");
