import assert from "node:assert/strict";
import {
  defineKidsCourse,
  getKidsCourseLevelCount,
  getKidsLevel,
  parseKidsCourse,
  parseKidsCourseJson,
  serializeKidsCourse,
} from "../src/features/kids-coding/domain/course-model.ts";

const validCourse = {
  schema: "systema.kids-course",
  schemaVersion: 1,
  contentVersion: 1,
  id: "robot-quest-model-check",
  slug: "robot-quest-model-check",
  title: "Robot Quest — Model Check",
  shortDescription: "Перевіряємо reusable data model на одному короткому challenge.",
  recommendedAge: { minimum: 6, maximum: 9 },
  status: "draft",
  accent: "RQ",
  worlds: [{
    id: "model-village",
    courseId: "robot-quest-model-check",
    slug: "village",
    position: 1,
    contentVersion: 1,
    title: "Village",
    description: "Перший світ із рухом по grid.",
    themeKey: "village",
    levels: [{
      id: "model-level-01",
      worldId: "model-village",
      slug: "first-steps",
      position: 1,
      contentVersion: 1,
      title: "Перші кроки",
      description: "Допоможи роботу дійти до зірки.",
      difficulty: "starter",
      learningModes: ["blocks"],
      challenge: {
        id: "model-challenge-01",
        levelId: "model-level-01",
        contentVersion: 1,
        title: "Дійди до зірки",
        description: "Побудуй коротку послідовність команд.",
        initialGameState: {
          grid: { columns: 4, rows: 3 },
          character: { id: "robot", position: { x: 0, y: 1 }, direction: "east" },
          obstacles: [{ id: "rock-01", kind: "rock", position: { x: 3, y: 2 } }],
          items: [{ id: "star-01", kind: "star", position: { x: 2, y: 1 } }],
          goal: { x: 2, y: 1 },
        },
        availableCommands: [{
          id: "move",
          kind: "move-forward",
          label: "Рухайся",
          description: "Переміщує робота вперед.",
          javascriptExample: "hero.move();",
          parameters: [],
        }],
        objective: {
          id: "reach-star",
          title: "Дійди до зірки",
          description: "Зупини робота на клітинці із зіркою.",
          expectedConditions: [
            { kind: "character-at", position: { x: 2, y: 1 } },
            { kind: "no-collision" },
          ],
        },
        maxRecommendedCommands: 3,
        hints: [
          { stage: 1, text: "Зірка прямо перед роботом." },
          { stage: 2, text: "Команду руху потрібно повторити." },
          { stage: 3, text: "Додай дві команди MOVE." },
        ],
        starCriteria: [
          { stars: 1, label: "Заверши рівень", conditions: [{ kind: "character-at", position: { x: 2, y: 1 } }] },
          { stars: 2, label: "Не зіткнися", conditions: [{ kind: "no-collision" }] },
          { stars: 3, label: "Вкладися у три команди", conditions: [{ kind: "command-count-at-most", count: 3 }] },
        ],
        rewards: [
          { id: "model-stars", type: "stars", referenceId: "model-challenge-01", quantity: 3 },
          { id: "first-steps-badge", type: "badge", referenceId: "first-steps", quantity: 1 },
        ],
      },
    }],
  }],
};

const parsed = parseKidsCourse(validCourse);
assert.equal(parsed.success, true);
if (!parsed.success) throw new Error("Valid fixture was rejected");
assert.equal(Object.isFrozen(parsed.data), true);
assert.equal(Object.isFrozen(parsed.data.worlds[0].levels[0].challenge), true);
assert.equal(getKidsCourseLevelCount(parsed.data), 1);
assert.equal(getKidsLevel(parsed.data, "village", "first-steps")?.level.id, "model-level-01");

const serialized = serializeKidsCourse(parsed.data);
const reparsed = parseKidsCourseJson(serialized);
assert.equal(reparsed.success, true);
assert.deepEqual(reparsed.success ? reparsed.data : null, parsed.data);
assert.equal(parseKidsCourseJson("not-json").success, false);

const invalidCourse = structuredClone(validCourse);
invalidCourse.schemaVersion = 2;
invalidCourse.worlds[0].levels[0].challenge.hints.pop();
invalidCourse.worlds[0].levels[0].challenge.initialGameState.character.position.x = 99;
invalidCourse.worlds[0].levels[0].challenge.onComplete = () => undefined;
const invalid = parseKidsCourse(invalidCourse);
assert.equal(invalid.success, false);
if (invalid.success) throw new Error("Invalid fixture was accepted");
assert.deepEqual(
  ["unsupported-schema-version", "position-out-of-bounds", "invalid-hint-count", "unknown-field"].every((code) => (
    invalid.issues.some((issue) => issue.code === code)
  )),
  true,
);
assert.throws(() => defineKidsCourse(invalidCourse), /schema version 1/);

const duplicateCourse = structuredClone(validCourse);
duplicateCourse.worlds.push(structuredClone(duplicateCourse.worlds[0]));
const duplicate = parseKidsCourse(duplicateCourse);
assert.equal(duplicate.success, false);
assert.equal(duplicate.success ? false : duplicate.issues.some((issue) => issue.code === "duplicate-value"), true);

console.log("Kids course model check passed: valid, JSON round-trip, invalid fields, bounds, hints, version and duplicates.");
