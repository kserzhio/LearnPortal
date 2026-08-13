import assert from "node:assert/strict";
import { defineLearningPath, type LearningPath } from "../src/features/learning-paths/domain/learning-path-model";
import { buildCourseCompletionGuidance } from "../src/features/learning-paths/recommendation/course-completion-guidance";

const catalog = { adult: ["course-a", "course-b", "course-c"], kids: [] } as const;
function path(id: string, status: "published" | "draft" = "published"): LearningPath {
  return defineLearningPath({
    schema: "systema.learning-path", schemaVersion: 1, contentVersion: 1, id, slug: id, title: `Path ${id}`,
    shortDescription: "Короткий опис шляху.", outcome: "Досягти перевіреного результату.", audience: "adult", status,
    duration: { estimatedHours: 10, recommendedWeeks: 4 },
    steps: [
      { id: `${id}-a`, position: 1, title: "Завершити A", outcome: "Основа.", requirement: "required", course: { catalog: "adult", courseId: "course-a" } },
      { id: `${id}-b`, position: 2, title: "Завершити B", outcome: "Наступний рівень.", requirement: "required", course: { catalog: "adult", courseId: "course-b" } },
    ],
  }, catalog);
}

const current = { catalog: "adult", courseId: "course-a" } as const;
const partial = [
  { ...current, completedUnits: 10, totalUnits: 10 },
  { catalog: "adult" as const, courseId: "course-b", completedUnits: 0, totalUnits: 8 },
];
const recommendation = buildCourseCompletionGuidance(current, [path("primary-path")], partial, (course) => course.courseId === "course-b");
assert.equal(recommendation.recommendations.length, 1);
assert.equal(recommendation.recommendations[0].nextCourse.courseId, "course-b");
assert.match(recommendation.recommendations[0].reason, /Наступний required крок/);
assert.equal(recommendation.completedPaths.length, 0);

const completed = buildCourseCompletionGuidance(current, [path("primary-path")], [partial[0], { ...partial[1], completedUnits: 8 }], () => true);
assert.equal(completed.recommendations.length, 0, "A completed path must not recommend more content");
assert.deepEqual(completed.completedPaths.map((entry) => entry.pathId), ["primary-path"]);
assert.equal(buildCourseCompletionGuidance(current, [path("draft-path", "draft")], partial, () => true).recommendations.length, 0);
assert.equal(buildCourseCompletionGuidance(current, [path("unpublished-target")], partial, () => false).recommendations.length, 0);
assert.equal(buildCourseCompletionGuidance({ catalog: "adult", courseId: "course-c" }, [path("orphan")], partial, () => true).recommendations.length, 0);
assert.equal(buildCourseCompletionGuidance(current, [path("one"), path("two")], partial, () => true).recommendations.length, 2, "Multiple memberships must remain explicit");
assert.equal(buildCourseCompletionGuidance(current, [path("not-complete")], [{ ...partial[0], completedUnits: 9 }, partial[1]], () => true).recommendations.length, 0);

console.log("Learning Path recommendation check passed: current, multiple, completed, draft, unpublished, orphan and incomplete cases.");
