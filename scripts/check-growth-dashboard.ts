import assert from "node:assert/strict";
import { formatDateInput, formatPercent, parseGrowthDashboardSnapshot, resolveGrowthDateRange } from "../src/features/growth-dashboard/growth-dashboard";

const now = new Date("2026-08-13T12:00:00.000Z");
const defaults = resolveGrowthDateRange(undefined,undefined,now);
assert.equal(formatDateInput(defaults.start),"2026-07-16");
assert.equal(formatDateInput(new Date(defaults.end.getTime()-86_400_000)),"2026-08-13");

const explicit = resolveGrowthDateRange("2026-08-01","2026-08-12",now);
assert.equal(formatDateInput(explicit.start),"2026-08-01");
assert.equal(formatDateInput(explicit.end),"2026-08-13");

const invalid = resolveGrowthDateRange("2026-09-01","2026-08-01",now);
assert.equal((invalid.end.getTime()-invalid.start.getTime())/86_400_000,29);
assert.equal(formatPercent(8,10),"80%");
assert.equal(formatPercent(0,0),"—");

const snapshot = parseGrowthDashboardSnapshot({
  period:{ start:"2026-08-01T00:00:00Z", end:"2026-08-14T00:00:00Z" },
  learning:{ activeLearners:2.9, adultLessonRecords:-2, lessonCompletions:4, courseCompletions:1, kidsAttempts:3, kidsCompletions:2 },
  quality:{ feedbackTotal:2, feedbackHelpful:1, knowledgeAttempts:3, knowledgeCorrect:2, questions:1, questionsResolved:0 },
  courses:[{ id:"course-a", title:"Course A", enrollments:3, active_learners:2, lesson_completions:4, course_completions:1 }],
  roadmapVotes:[{ course_slug:"frontend-architecture", vote_count:5 }],
});
assert.ok(snapshot);
assert.equal(snapshot.learning.activeLearners,2);
assert.equal(snapshot.learning.adultLessonRecords,0);
assert.equal(snapshot.courses[0].title,"Course A");
assert.equal(snapshot.roadmapVotes[0].vote_count,5);
assert.equal(parseGrowthDashboardSnapshot({}),null);

console.log("Growth dashboard check passed: date ranges, zero-safe ratios and untrusted aggregate parsing are deterministic.");
