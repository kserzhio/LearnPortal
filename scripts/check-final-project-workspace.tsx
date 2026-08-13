import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import type { SupabaseClient } from "@supabase/supabase-js";
import { finalDesignComponentIds, finalDesignRequiredConnections, finalDesignRuleIds } from "../src/lib/simulators/final-system-design";
import { finalProjects, resolveFinalProjectValidator } from "../src/features/final-projects/content/final-project-registry";
import { describeAffectedIds, describeFinalProjectState } from "../src/features/final-projects/presentation/final-project-state";
import { loadFinalProjectArtifact } from "../src/features/final-projects/persistence/server-persistence";

const project = finalProjects[0];
assert.ok(project);
const validator = resolveFinalProjectValidator(project);
assert.ok(validator);

const starterSummary = describeFinalProjectState(project.starterScenario.state);
assert.equal(starterSummary.componentIds.length, 0);
assert.equal(starterSummary.scenarioLabel, "Відмова primary database");
const starterResult = validator.validateState(project.starterScenario.state);
assert.equal(starterResult?.valid, false);
assert.equal(describeAffectedIds(starterResult!).includes("PostgreSQL"), true);

const completeState = {
  components: [...finalDesignComponentIds],
  rules: finalDesignRuleIds.map((id) => ({ id, value: id })),
  scenario: "region-outage",
  connections: [...finalDesignRequiredConnections],
};
assert.equal(validator.validateState(completeState)?.valid, true);

function fakeSupabase(rows: readonly Record<string, unknown>[], error: unknown = null) {
  const builder: Record<string, unknown> = {};
  builder.select = () => builder;
  builder.eq = () => builder;
  builder.is = () => builder;
  builder.order = () => builder;
  builder.limit = async () => ({ data: rows, error });
  return { from: () => builder } as unknown as SupabaseClient;
}

const restored = await loadFinalProjectArtifact(fakeSupabase([{
  id: "00000000-0000-4000-8000-000000000001",
  diagram: completeState,
  schema_version: 1,
  updated_at: "2026-08-13T12:00:00.000Z",
}]), "user-1", project);
assert.equal(restored.status, "available");
assert.equal(restored.artifact?.id, "00000000-0000-4000-8000-000000000001");

const incompatibleArtifact = await loadFinalProjectArtifact(fakeSupabase([{
  id: "00000000-0000-4000-8000-000000000002",
  diagram: { components: ["unknown"] },
  schema_version: 2,
  updated_at: "2026-08-13T12:00:00.000Z",
}]), "user-1", project);
assert.equal(incompatibleArtifact.status, "available");
assert.equal(incompatibleArtifact.artifact, null);

const unavailableArtifact = await loadFinalProjectArtifact(fakeSupabase([], { message: "database unavailable" }), "user-1", project);
assert.equal(unavailableArtifact.status, "unavailable");

const [pageSource, workspaceSource, actionSource, styleSource] = await Promise.all([
  readFile("src/app/projects/[slug]/page.tsx", "utf8"),
  readFile("src/features/final-projects/ui/final-project-workspace.tsx", "utf8"),
  readFile("src/app/projects/[slug]/actions.ts", "utf8"),
  readFile("src/features/final-projects/ui/final-project-workspace.module.css", "utf8"),
]);
assert.match(pageSource, /project\.status !== "published"/);
assert.match(pageSource, /aria-labelledby="requirementsHeading"/);
assert.match(workspaceSource, /Запустити перевірку/);
assert.match(workspaceSource, /Увійти для збереження/);
assert.match(workspaceSource, /role="status"/);
assert.match(workspaceSource, /Архітектура як список/);
assert.match(workspaceSource, /Відновлена збережена схема/);
assert.match(workspaceSource, /requestAnimationFrame\(\(\) => resultRef\.current\?\.focus\(\)\)/);
assert.match(actionSource, /auth\.getUser\(\)/);
assert.match(actionSource, /\.eq\("user_id"|user_id:/);
assert.doesNotMatch(actionSource, /localStorage|sessionStorage/);
assert.doesNotMatch(styleSource, /\dpx\b/);

console.log("Final Project workspace check passed: guest/auth states, restored architecture, deterministic validation, semantic content and protected persistence.");
