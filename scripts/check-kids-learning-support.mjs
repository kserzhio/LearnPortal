import assert from "node:assert/strict";
import { kidsCourses } from "../src/features/kids-coding/content/index.ts";
import {
  calculateRewardGrants,
  containsTechnicalDetails,
  createFriendlyFeedback,
  createHintProgress,
  getStarSummary,
  isChildSafeFeedback,
  parseHintProgress,
  revealNextHint,
  rewardGrantToUnlock,
} from "../src/features/kids-coding/support/index.ts";

const challenge = kidsCourses[0].worlds[0].levels[0].challenge;
const baseResult = {
  valid: true,
  code: "level-completed",
  message: "internal engine message",
  affectedIds: [],
  stars: 3,
  metrics: { commandCount: 1, operationCount: 1, usedConcepts: ["move-forward"] },
};

let hintProgress = createHintProgress(challenge);
const revealed = [];
for (const expectedStage of [1, 2, 3]) {
  const next = revealNextHint(challenge, hintProgress);
  assert.equal(next.hint?.stage, expectedStage);
  assert.equal(next.hint?.text, challenge.hints[expectedStage - 1].text);
  revealed.push(next.hint);
  hintProgress = next.progress;
}
assert.deepEqual(revealed.map((hint) => hint?.kind), ["concept", "stronger-clue", "partial-solution"]);
assert.equal(revealed[2]?.isLast, true);
assert.equal(revealNextHint(challenge, hintProgress).hint, null);
assert.deepEqual(parseHintProgress(JSON.parse(JSON.stringify(hintProgress)), challenge), hintProgress);
assert.equal(parseHintProgress({ ...hintProgress, revealedStages: [1, 3] }, challenge), null);
assert.deepEqual(revealNextHint(challenge, { ...hintProgress, challengeId: "wrong" }).progress.revealedStages, [1]);

const collision = createFriendlyFeedback({
  valid: false,
  code: "collision-detected",
  message: "TypeError: internal AST at engine.ts:42",
  affectedIds: ["rock-one", "unsafe id"],
});
assert.equal(collision.code, "collision-detected");
assert.equal(collision.tone, "try-again");
assert.deepEqual(collision.affectedIds, ["rock-one"]);
assert.equal(isChildSafeFeedback(collision), true);
assert.equal(containsTechnicalDetails(collision.message), false);

const unknown = createFriendlyFeedback({
  valid: false,
  code: "Bad code!",
  message: "SyntaxError: TypeError: internal AST at file.ts:2",
});
assert.equal(unknown.code, "unknown-result");
assert.equal(isChildSafeFeedback(unknown), true);
assert.equal(JSON.stringify(unknown).includes("SyntaxError"), false);
assert.equal(JSON.stringify(unknown).includes("internal AST"), false);
assert.equal(createFriendlyFeedback({ valid: false, code: "sandbox-api-forbidden" }).tone, "try-again");
assert.equal(createFriendlyFeedback(baseResult).tone, "success");

const oneStar = getStarSummary(challenge, { ...baseResult, stars: 1 });
assert.deepEqual(oneStar.map((item) => item.purpose), ["completion", "efficiency", "intended-concept"]);
assert.deepEqual(oneStar.map((item) => item.earned), [true, false, false]);
assert.ok(oneStar.every((item) => item.label.length > 0));
assert.deepEqual(getStarSummary(challenge, { ...baseResult, valid: false, stars: 3 }).map((item) => item.earned), [false, false, false]);

const rewardChallenge = {
  ...challenge,
  rewards: [
    { id: "reward-stars", type: "stars", referenceId: challenge.levelId, quantity: 3 },
    { id: "reward-badge", type: "badge", referenceId: "pathfinder", quantity: 1 },
    { id: "reward-character", type: "character", referenceId: "robot-nova", quantity: 1 },
    { id: "reward-skin", type: "skin", referenceId: "forest-skin", quantity: 1 },
    { id: "reward-pet", type: "pet", referenceId: "pixel-cat", quantity: 1 },
    { id: "reward-accessory", type: "accessory", referenceId: "green-hat", quantity: 1 },
    { id: "reward-world", type: "world-unlock", referenceId: "cloud-city", quantity: 1 },
  ],
};
const grants = calculateRewardGrants(rewardChallenge, { ...baseResult, stars: 2 });
assert.equal(grants.length, 7);
assert.equal(grants.find((grant) => grant.type === "stars")?.quantity, 2);
assert.deepEqual(calculateRewardGrants(rewardChallenge, { ...baseResult, stars: 2 }), grants);
assert.deepEqual(calculateRewardGrants(rewardChallenge, { ...baseResult, valid: false }), []);
assert.equal(calculateRewardGrants(rewardChallenge, baseResult, [grants[0].id]).length, 6);

const serializedGrants = JSON.stringify(grants);
for (const forbiddenField of ["price", "currency", "random", "rarity", "loot"]) {
  assert.equal(serializedGrants.toLowerCase().includes(forbiddenField), false);
}
const when = "2026-08-11T12:00:00.000Z";
assert.equal(rewardGrantToUnlock(grants.find((grant) => grant.type === "stars"), when), null);
assert.equal(rewardGrantToUnlock(grants.find((grant) => grant.type === "badge"), when)?.kind, "achievement");
assert.equal(rewardGrantToUnlock(grants.find((grant) => grant.type === "world-unlock"), when)?.kind, "world");
assert.equal(rewardGrantToUnlock(grants.find((grant) => grant.type === "pet"), when)?.kind, "reward");

for (const course of kidsCourses) {
  for (const world of course.worlds) {
    for (const level of world.levels) {
      assert.deepEqual(level.challenge.hints.map((hint) => hint.stage), [1, 2, 3]);
      assert.ok(level.challenge.hints.every((hint) => hint.text.trim().length > 0));
      assert.deepEqual(level.challenge.starCriteria.map((criterion) => criterion.stars), [1, 2, 3]);
    }
  }
}

console.log("Kids learning support checks passed.");
