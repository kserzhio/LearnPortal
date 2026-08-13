import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import { skillContentCatalog, skillTaxonomy } from "../src/features/skills/content/skill-taxonomy-registry";
import { buildSkillProgress, mergeSkillUnitCompletions } from "../src/features/skills/progress/skill-progress";
import { loadSkillUnitCompletions } from "../src/features/skills/progress/server-progress";

const progressFor = (skillId: string, records: Parameters<typeof buildSkillProgress>[2]) => {
  const progress = buildSkillProgress(skillTaxonomy, skillContentCatalog, records).find((entry) => entry.skill.id === skillId);
  assert.ok(progress);
  return progress;
};
const adult = (unitId: string, completed = true) => ({ catalog:"adult" as const, courseId:"high-load-architecture", unitId, completed });
const kids = (unitId: string, completed = true) => ({ catalog:"kids" as const, courseId:"robot-quest-algorithms", unitId, completed });

const untouched = progressFor("capacity-planning", []);
assert.equal(untouched.state, "not_started");
assert.equal(untouched.stateLabel, "Ще не розпочато");
assert.match(untouched.explanation, /Ще немає завершених/);

const partial = progressFor("capacity-planning", [adult("high-load-01")]);
assert.equal(partial.state, "in_progress");
assert.deepEqual(partial.evidence, { catalog:"adult", courseId:"high-load-architecture", completedUnits:1, requiredUnits:2 });
assert.match(partial.explanation, /1 із 2/);

const repeated = [adult("high-load-01"), adult("high-load-01"), adult("high-load-01", false), adult("high-load-03")];
const completed = progressFor("capacity-planning", repeated);
assert.equal(completed.state, "completed");
assert.equal(completed.evidence.completedUnits, 2, "Duplicate completion must not inflate evidence");
assert.match(completed.explanation, /Завершено всі 2/);

const robotUnits = skillContentCatalog.kids.find((course) => course.courseId === "robot-quest-algorithms")?.unitIds ?? [];
const shared = progressFor("systems-thinking", robotUnits.map((unitId) => kids(unitId)));
assert.equal(shared.state, "completed", "A shared skill completes through one full alternative course track");
assert.equal(shared.evidence.catalog, "kids");
assert.equal(shared.evidence.requiredUnits, robotUnits.length);

const monotonic = mergeSkillUnitCompletions([adult("high-load-01")], [adult("high-load-01", false)]);
assert.deepEqual(monotonic, [adult("high-load-01")], "A later false record must not reverse completion");

type QueryCall = Readonly<{ table:string; operation:string; column?:string; value?:unknown }>;
function fakeSupabase(options: { fail?: boolean } = {}) {
  const calls: QueryCall[] = [];
  const rows = {
    lesson_progress: [{ course_id:"high-load-architecture", lesson_id:"high-load-01", completed:true }],
    kids_level_progress: [{ course_id:"robot-quest-algorithms", level_id:"robot-village-01", completed:true }],
  };
  const client = {
    from(table: keyof typeof rows) {
      calls.push({ table, operation:"from" });
      const builder = {
        select(value:string) { calls.push({ table, operation:"select", value }); return builder; },
        eq(column:string, value:unknown) { calls.push({ table, operation:"eq", column, value }); return builder; },
        in(column:string, value:unknown) { calls.push({ table, operation:"in", column, value }); return Promise.resolve({ data:rows[table], error:options.fail ? { message:"failed" } : null }); },
      };
      return builder;
    },
  } as unknown as SupabaseClient;
  return { client, calls };
}

const server = fakeSupabase();
const loaded = await loadSkillUnitCompletions(server.client, "owner-123", skillTaxonomy);
assert.equal(loaded.available, true);
assert.equal(loaded.records.length, 2);
assert.equal(server.calls.filter((call) => call.operation === "eq" && call.column === "user_id" && call.value === "owner-123").length, 2, "Both progress queries must be owner-scoped");
const failed = await loadSkillUnitCompletions(fakeSupabase({ fail:true }).client, "owner-123", skillTaxonomy);
assert.deepEqual(failed, { available:false, records:[] }, "Database errors must not become a false zero-progress state");

console.log("Skill progress check passed: untouched, partial, complete, shared, monotonic, deduplicated and owner-only server cases.");
