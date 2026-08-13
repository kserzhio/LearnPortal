import assert from "node:assert/strict";
import { courses } from "../src/content/courses";
import { buildRoadmapCourses, getRoadmapCandidates, isRoadmapCourseSlug, rankRoadmapCourses } from "../src/features/roadmap/roadmap";

const candidates = getRoadmapCandidates(courses);
assert.deepEqual(candidates.map((course) => course.slug), ["frontend-architecture", "platform-engineering"]);
assert.equal(isRoadmapCourseSlug(courses, "frontend-architecture"), true);
assert.equal(isRoadmapCourseSlug(courses, "high-load-architecture"), false);
assert.equal(isRoadmapCourseSlug(courses, "unknown"), false);

const roadmap = buildRoadmapCourses(courses, [
  { courseSlug: "platform-engineering", voteCount: 7.8 },
  { courseSlug: "frontend-architecture", voteCount: -2 },
  { courseSlug: "unknown", voteCount: 999 },
], "platform-engineering");
assert.deepEqual(roadmap.map(({ slug, voteCount, selected }) => ({ slug, voteCount, selected })), [
  { slug: "frontend-architecture", voteCount: 0, selected: false },
  { slug: "platform-engineering", voteCount: 7, selected: true },
]);
assert.equal(rankRoadmapCourses(roadmap)[0].slug, "platform-engineering");

console.log("Course roadmap check passed: only planned catalog courses are votable, totals are sanitized and ranking is deterministic.");
