import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [ui, styles, migration, roleMigration, content, questionApi, feedbackApi, checkApi, legacyUi, legacyShell] = await Promise.all([
  readFile("src/features/learning-support/learning-support.tsx", "utf8"),
  readFile("src/features/learning-support/learning-support.module.css", "utf8"),
  readFile("supabase/migrations/202608120001_learning_support.sql", "utf8"),
  readFile("supabase/migrations/202608120002_protect_profile_roles.sql", "utf8"),
  readFile("src/features/learning-support/content.ts", "utf8"),
  readFile("src/app/api/learning-support/questions/route.ts", "utf8"),
  readFile("src/app/api/learning-support/feedback/route.ts", "utf8"),
  readFile("src/app/api/learning-support/knowledge-checks/route.ts", "utf8"),
  readFile("public/legacy/runtime/learning-support.js", "utf8"),
  readFile("public/legacy/runtime/course-shell.js", "utf8"),
]);

assert.match(ui, /<dialog[\s\S]*aria-labelledby=/, "Question form must use a named native dialog.");
assert.match(ui, /aria-expanded=\{open\}/, "FAQ triggers must expose expanded state.");
assert.match(ui, /<fieldset><legend>/, "Knowledge checks must use fieldset and legend.");
assert.match(ui, /role="status"/, "Dynamic learning results must be announced.");
assert.match(ui, /aria-pressed=\{helpful === true\}/, "Feedback selection must be programmatic.");
assert.match(ui, /type="radio"/, "Single-answer checks must use radio controls.");
assert.doesNotMatch(styles, /\dpx\b/, "Learning support CSS must not introduce px units.");
assert.match(styles, /@media \(max-width:30em\)/, "Learning support must reflow at narrow widths.");
assert.match(styles, /prefers-reduced-motion/, "Learning support must respect reduced motion.");
assert.match(styles, /forced-colors/, "Learning support must support Forced Colors.");

for (const table of ["lesson_questions", "lesson_replies", "reply_useful_votes", "lesson_feedback", "knowledge_check_attempts"]) {
  assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`), `${table} must enable RLS.`);
}
assert.match(migration, /role in \('USER', 'INSTRUCTOR', 'ADMIN'\)/, "Roles must be constrained.");
assert.match(roleMigration, /revoke update \(role\).*authenticated/i, "Authenticated users must not be able to promote their own profile role.");
assert.match(questionApi, /if \(!supabase \|\| !user\)/, "Question publishing must require authentication.");
assert.match(feedbackApi, /allowedReasons/, "Feedback reasons must use an allowlist.");
assert.match(checkApi, /findKnowledgeCheck/, "Correct answers must be evaluated from trusted server content.");
assert.match(content, /incorrectExplanation/, "Every knowledge check must explain wrong answers.");
for (const lesson of ["01", "09", "13", "15", "19"]) {
  assert.match(content, new RegExp(`high-load-${lesson}`), `Selected lesson ${lesson} must have a server-validated knowledge check.`);
}
assert.match(legacyShell, /systema:lesson-change/, "Legacy lesson navigation must announce lesson changes.");
assert.match(legacyUi, /high-load-\$\{String\(state\.lesson\.position\)\.padStart\(2, '0'\)\}/, "Every legacy lesson needs a stable shared contentId.");
assert.match(legacyUi, /legacyQuestionCount/, "Legacy Q&A must expose the real question count.");
assert.match(legacyUi, /toggle-official/, "Legacy moderator UI must support official answers.");
assert.match(legacyUi, /toggle-resolved/, "Legacy moderator UI must support resolved questions.");

console.log("Learning support check passed: Q&A, FAQ, feedback, knowledge checks, RLS and responsive accessibility contracts are present.");
