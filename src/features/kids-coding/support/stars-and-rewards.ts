import type { ChallengeDefinition, RewardDefinition } from "../domain";
import type { LevelResult } from "../engine";

export const KIDS_REWARD_GRANT_SCHEMA = "systema.kids-reward-grant" as const;
export const KIDS_REWARD_GRANT_SCHEMA_VERSION = 1 as const;

export type StarSummaryItem = Readonly<{
  stars: 1 | 2 | 3;
  purpose: "completion" | "efficiency" | "intended-concept";
  label: string;
  earned: boolean;
}>;

export type RewardGrant = Readonly<{
  schema: typeof KIDS_REWARD_GRANT_SCHEMA;
  schemaVersion: typeof KIDS_REWARD_GRANT_SCHEMA_VERSION;
  id: string;
  challengeId: string;
  challengeContentVersion: number;
  rewardId: string;
  type: RewardDefinition["type"];
  referenceId: string;
  quantity: number;
  reason: "level-completed";
}>;

export type RewardUnlock = Readonly<{
  kind: "world" | "achievement" | "reward";
  referenceId: string;
  unlockedAt: string;
}>;

const purposes: readonly StarSummaryItem["purpose"][] = ["completion", "efficiency", "intended-concept"];

export function getStarSummary(challenge: ChallengeDefinition, result: LevelResult): readonly StarSummaryItem[] {
  return challenge.starCriteria.map((criterion, index) => ({
    stars: criterion.stars,
    purpose: purposes[index],
    label: criterion.label,
    earned: result.valid && result.stars >= criterion.stars,
  }));
}

export function calculateRewardGrants(
  challenge: ChallengeDefinition,
  result: LevelResult,
  alreadyClaimedGrantIds: readonly string[] = [],
): readonly RewardGrant[] {
  if (!result.valid) return [];
  const claimed = new Set(alreadyClaimedGrantIds);
  return challenge.rewards.flatMap((reward): RewardGrant[] => {
    const id = `${challenge.id}-${reward.id}`;
    const quantity = reward.type === "stars" ? Math.min(reward.quantity, result.stars) : reward.quantity;
    if (quantity < 1 || claimed.has(id)) return [];
    return [{
      schema: KIDS_REWARD_GRANT_SCHEMA,
      schemaVersion: KIDS_REWARD_GRANT_SCHEMA_VERSION,
      id,
      challengeId: challenge.id,
      challengeContentVersion: challenge.contentVersion,
      rewardId: reward.id,
      type: reward.type,
      referenceId: reward.referenceId,
      quantity,
      reason: "level-completed",
    }];
  });
}

export function rewardGrantToUnlock(grant: RewardGrant, unlockedAt: string): RewardUnlock | null {
  if (grant.type === "stars") return null;
  const kind = grant.type === "world-unlock" ? "world" : grant.type === "badge" ? "achievement" : "reward";
  return { kind, referenceId: grant.referenceId, unlockedAt };
}
