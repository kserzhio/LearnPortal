import type { ChallengeDefinition } from "../domain";

export const KIDS_HINT_STATE_SCHEMA = "systema.kids-hint-state" as const;
export const KIDS_HINT_STATE_SCHEMA_VERSION = 1 as const;

export type HintStage = 1 | 2 | 3;
export type HintKind = "concept" | "stronger-clue" | "partial-solution";

export type HintProgress = Readonly<{
  schema: typeof KIDS_HINT_STATE_SCHEMA;
  schemaVersion: typeof KIDS_HINT_STATE_SCHEMA_VERSION;
  challengeId: string;
  revealedStages: readonly HintStage[];
}>;

export type RevealedHint = Readonly<{
  stage: HintStage;
  kind: HintKind;
  label: string;
  text: string;
  isLast: boolean;
}>;

const hintPresentation: Readonly<Record<HintStage, Readonly<{ kind: HintKind; label: string }>>> = {
  1: { kind: "concept", label: "Легка підказка" },
  2: { kind: "stronger-clue", label: "Точніша підказка" },
  3: { kind: "partial-solution", label: "Частина розв’язку" },
};

export function createHintProgress(challenge: ChallengeDefinition): HintProgress {
  return {
    schema: KIDS_HINT_STATE_SCHEMA,
    schemaVersion: KIDS_HINT_STATE_SCHEMA_VERSION,
    challengeId: challenge.id,
    revealedStages: [],
  };
}

export function parseHintProgress(value: unknown, challenge: ChallengeDefinition): HintProgress | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.schema !== KIDS_HINT_STATE_SCHEMA
    || record.schemaVersion !== KIDS_HINT_STATE_SCHEMA_VERSION
    || record.challengeId !== challenge.id
    || !Array.isArray(record.revealedStages)) return null;
  const stages = record.revealedStages;
  if (stages.length > 3 || !stages.every((stage, index) => stage === index + 1)) return null;
  return { ...createHintProgress(challenge), revealedStages: [...stages] as HintStage[] };
}

export function revealNextHint(
  challenge: ChallengeDefinition,
  progress: HintProgress,
): Readonly<{ progress: HintProgress; hint: RevealedHint | null; complete: boolean }> {
  const trusted = parseHintProgress(progress, challenge) ?? createHintProgress(challenge);
  const nextStage = trusted.revealedStages.length + 1;
  if (nextStage > 3) return { progress: trusted, hint: null, complete: true };
  const stage = nextStage as HintStage;
  const definition = challenge.hints[stage - 1];
  const presentation = hintPresentation[stage];
  return {
    progress: { ...trusted, revealedStages: [...trusted.revealedStages, stage] },
    hint: { stage, ...presentation, text: definition.text, isLast: stage === 3 },
    complete: stage === 3,
  };
}
