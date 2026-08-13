import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import type { SupabaseClient } from "@supabase/supabase-js";
import { finalProjects } from "../src/features/final-projects/content/final-project-registry";
import { loadCompletedProjectExport, loadCompletedProjects } from "../src/features/final-projects/persistence/completed-projects";
import { finalDesignComponentIds, finalDesignRequiredConnections, finalDesignRuleIds } from "../src/lib/simulators/final-system-design";

const project = finalProjects[0];
assert.ok(project);
const validDiagram = { components: [...finalDesignComponentIds], rules: finalDesignRuleIds.map((id) => ({ id, value: id })), scenario: "db-primary", connections: [...finalDesignRequiredConnections] };
const completedRow = { id: "00000000-0000-4000-8000-000000000001", project_id: project.id, project_version: project.contentVersion, title: project.title, diagram: validDiagram, schema_version: project.starterScenario.simulatorSchemaVersion, completed_at: "2026-08-13T12:00:00.000Z", updated_at: "2026-08-13T13:00:00.000Z" };

function fakeSupabase(rows: readonly Record<string, unknown>[], error: unknown = null) {
  const builder: Record<string, unknown> = {};
  builder.select = () => builder; builder.eq = () => builder; builder.not = () => builder; builder.order = () => builder;
  builder.limit = async () => ({ data: rows, error }); builder.maybeSingle = async () => ({ data: rows[0] ?? null, error });
  return { from: () => builder } as unknown as SupabaseClient;
}

const ownerLibrary = await loadCompletedProjects(fakeSupabase([completedRow]), "owner-1");
assert.equal(ownerLibrary.error, false);
assert.equal(ownerLibrary.projects.length, 1);
assert.equal(ownerLibrary.projects[0].projectVersion, project.contentVersion);
const incompatible = await loadCompletedProjects(fakeSupabase([{ ...completedRow, project_version: project.contentVersion + 1 }]), "owner-1");
assert.equal(incompatible.projects.length, 0, "Incompatible project versions are hidden");
const invalidCompletion = await loadCompletedProjects(fakeSupabase([{ ...completedRow, diagram: { ...validDiagram, connections: [] } }]), "owner-1");
assert.equal(invalidCompletion.projects.length, 0, "A completion marker never bypasses current version validation");
const exported = await loadCompletedProjectExport(fakeSupabase([completedRow]), "owner-1", completedRow.id);
assert.equal(exported?.document.projectVersion, project.contentVersion);
assert.deepEqual(exported?.document.state, validDiagram);

const [pageSource, actionSource, migrationSource, exportSource, stylesSource] = await Promise.all([
  readFile("src/app/dashboard/projects/page.tsx", "utf8"),
  readFile("src/app/dashboard/projects/actions.ts", "utf8"),
  readFile("supabase/migrations/202608130002_completed_final_projects.sql", "utf8"),
  readFile("src/app/dashboard/projects/[id]/export/route.ts", "utf8"),
  readFile("src/app/dashboard/projects/projects.module.css", "utf8"),
]);
assert.match(pageSource, /redirect\("\/auth\/sign-in\?next=%2Fdashboard%2Fprojects"\)/);
assert.match(pageSource, /Приватно за замовчуванням/);
assert.match(actionSource, /\.eq\("user_id", user\.id\)/);
assert.match(actionSource, /confirmed/);
const saveActionSource = await readFile("src/app/projects/[slug]/actions.ts", "utf8");
assert.match(saveActionSource, /preserveCompletedRevision/);
assert.match(saveActionSource, /existing\?\.completed_at && !validation\?\.valid/);
assert.match(migrationSource, /completed_at timestamptz/);
assert.match(migrationSource, /saved_architectures_user_completed_idx/);
assert.match(exportSource, /Cache-Control": "private, no-store/);
assert.doesNotMatch(stylesSource, /\dpx\b/);

console.log("Completed Projects check passed: version filtering, owner scope, private export, confirmation and migration contract.");
