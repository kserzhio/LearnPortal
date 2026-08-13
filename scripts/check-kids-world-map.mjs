import assert from "node:assert/strict";
import { kidsCourses } from "../src/features/kids-coding/content/course-registry.ts";
import { createEmptyKidsProgress } from "../src/features/kids-coding/progress/progress-model.ts";
import { buildKidsWorldMap } from "../src/features/kids-coding/world-map/world-map-model.ts";

const course = kidsCourses[0];
const empty = createEmptyKidsProgress(course.id);
const initial = buildKidsWorldMap(course, empty);
assert.equal(initial.current?.levelId, "robot-village-01");
assert.deepEqual(initial.worlds[0].levels.map((level) => level.status), ["current", "locked", "locked", "locked", "locked"]);
assert.equal(initial.completedLevels, 0);
assert.equal(initial.availableStars, 15);

const firstCompleted = {
  ...empty,
  levels: [{
    worldId: "village", levelId: "robot-village-01", completed: true, stars: 2, attemptCount: 1,
    bestSolution: null, updatedAt: "2026-08-11T12:00:00.000Z",
  }],
};
const afterFirst = buildKidsWorldMap(course, firstCompleted);
assert.deepEqual(afterFirst.worlds[0].levels.map((level) => level.status), ["completed", "current", "locked", "locked", "locked"]);
assert.equal(afterFirst.current?.levelId, "robot-village-02");
assert.equal(afterFirst.earnedStars, 2);

const baseWorld = course.worlds[0];
const baseLevel = baseWorld.levels[0];
const worldNames = ["Village", "Forest", "Desert", "Ice World", "Space"];
const fiveWorldCourse = {
  id: course.id,
  worlds: worldNames.map((title, index) => {
    const id = title.toLowerCase().replaceAll(" ", "-");
    return {
      ...baseWorld,
      id,
      title,
      position: index + 1,
      themeKey: id,
      levels: [{ ...baseLevel, id: `${id}-01`, worldId: id, position: 1, title: `${title} level` }],
    };
  }),
};
const villageComplete = {
  ...empty,
  levels: [{
    worldId: "village", levelId: "village-01", completed: true, stars: 3, attemptCount: 1,
    bestSolution: null, updatedAt: "2026-08-11T12:00:00.000Z",
  }],
};
const progression = buildKidsWorldMap(fiveWorldCourse, villageComplete);
assert.deepEqual(progression.worlds.map((world) => world.title), worldNames);
assert.deepEqual(progression.worlds.map((world) => world.status), ["completed", "current", "locked", "locked", "locked"]);
assert.equal(progression.current?.worldId, "forest");

const explicitUnlockProgress = {
  ...empty,
  unlocks: [{ kind: "world", referenceId: "space", unlockedAt: "2026-08-11T12:00:00.000Z" }],
};
const explicitUnlock = buildKidsWorldMap(fiveWorldCourse, explicitUnlockProgress);
assert.equal(explicitUnlock.current?.worldId, "village");
assert.equal(explicitUnlock.worlds.at(-1).status, "unlocked");
assert.equal(explicitUnlock.worlds.at(-1).levels[0].status, "available");
assert.deepEqual(buildKidsWorldMap(fiveWorldCourse, explicitUnlockProgress), explicitUnlock);
assert.doesNotThrow(() => JSON.parse(JSON.stringify(explicitUnlock)));
assert.throws(() => buildKidsWorldMap(fiveWorldCourse, { ...empty, courseId: "another-course" }), /another course/);

console.log("Kids world map checks passed: sequential levels, world unlocks, one current level, explicit unlocks and five-world configuration.");
