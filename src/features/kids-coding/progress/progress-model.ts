import type { ProgramDefinition, SerializedLevelAttempt } from "../engine";

export const KIDS_PROGRESS_SCHEMA = "systema.kids-progress" as const;
export const KIDS_PROGRESS_SCHEMA_VERSION = 1 as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SAFE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_ATTEMPTS_PER_COURSE = 500;
const MAX_UNLOCKS_PER_COURSE = 200;
const MAX_ATTEMPT_JSON_LENGTH = 64_000;
const MAX_PROGRAM_NODES = 200;
const MAX_PROGRAM_DEPTH = 12;

export type KidsUnlockKind = "world" | "achievement" | "reward";

export type KidsProgressCatalog = Readonly<{
  courseId: string;
  worlds: readonly Readonly<{
    id: string;
    position: number;
    levelIds: readonly string[];
  }>[];
}>;

export type KidsAttemptRecord = Readonly<{
  id: string;
  courseId: string;
  worldId: string;
  levelId: string;
  createdAt: string;
  attempt: SerializedLevelAttempt;
}>;

export type KidsUnlockRecord = Readonly<{
  kind: KidsUnlockKind;
  referenceId: string;
  unlockedAt: string;
}>;

export type KidsBestSolution = Readonly<{
  attemptId: string;
  challengeContentVersion: number;
  program: ProgramDefinition;
  stars: 1 | 2 | 3;
  commandCount: number;
  recordedAt: string;
}>;

export type KidsLevelProgress = Readonly<{
  worldId: string;
  levelId: string;
  completed: boolean;
  stars: 0 | 1 | 2 | 3;
  attemptCount: number;
  bestSolution: KidsBestSolution | null;
  updatedAt: string;
}>;

export type KidsProgressBundle = Readonly<{
  schema: typeof KIDS_PROGRESS_SCHEMA;
  schemaVersion: typeof KIDS_PROGRESS_SCHEMA_VERSION;
  courseId: string;
  levels: readonly KidsLevelProgress[];
  completedWorldIds: readonly string[];
  attempts: readonly KidsAttemptRecord[];
  unlocks: readonly KidsUnlockRecord[];
  updatedAt: string;
}>;

export type KidsProgressIssue = Readonly<{
  code: string;
  path: string;
  message: string;
  affectedIds: readonly string[];
}>;

export type KidsProgressParseResult =
  | Readonly<{ success: true; data: KidsProgressBundle }>
  | Readonly<{ success: false; issues: readonly KidsProgressIssue[] }>;

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isSafeId(value: unknown): value is string {
  return typeof value === "string" && SAFE_ID.test(value);
}

function isDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function isInteger(value: unknown, minimum = 0, maximum = Number.MAX_SAFE_INTEGER): value is number {
  return Number.isInteger(value) && (value as number) >= minimum && (value as number) <= maximum;
}

function addIssue(
  issues: KidsProgressIssue[],
  code: string,
  path: string,
  message: string,
  affectedIds: readonly string[] = [],
) {
  issues.push({ code, path, message, affectedIds: [...affectedIds] });
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function programNodeCountAndValidity(value: unknown, depth = 0): Readonly<{ valid: boolean; count: number }> {
  if (depth > MAX_PROGRAM_DEPTH || !Array.isArray(value)) return { valid: false, count: 0 };
  let count = 0;
  for (const entry of value) {
    if (!isRecord(entry) || !isSafeId(entry.id) || !isSafeId(entry.commandId) || typeof entry.type !== "string") {
      return { valid: false, count };
    }
    count += 1;
    if (entry.type === "command") {
      if (!isRecord(entry.arguments) || Object.values(entry.arguments).some((argument) => (
        !["string", "number", "boolean"].includes(typeof argument)
        || (typeof argument === "number" && !Number.isInteger(argument))
      ))) return { valid: false, count };
      continue;
    }
    if (entry.type === "repeat") {
      if (!isInteger(entry.count, 1, 50)) return { valid: false, count };
      const body = programNodeCountAndValidity(entry.body, depth + 1);
      if (!body.valid) return { valid: false, count };
      count += body.count;
      continue;
    }
    if (entry.type === "if") {
      if (!isRecord(entry.predicate) || !["path-ahead-clear", "item-here", "facing-direction"].includes(String(entry.predicate.kind))) {
        return { valid: false, count };
      }
      const thenBranch = programNodeCountAndValidity(entry.then, depth + 1);
      const elseBranch = programNodeCountAndValidity(entry.else, depth + 1);
      if (!thenBranch.valid || !elseBranch.valid) return { valid: false, count };
      count += thenBranch.count + elseBranch.count;
      continue;
    }
    if (entry.type === "call-function") {
      if (!isSafeId(entry.functionId)) return { valid: false, count };
      continue;
    }
    return { valid: false, count };
  }
  return { valid: count <= MAX_PROGRAM_NODES, count };
}

function isPortableProgram(value: unknown): value is ProgramDefinition {
  if (!isRecord(value)
    || value.schema !== "systema.kids-program"
    || value.schemaVersion !== 1
    || !Array.isArray(value.instructions)
    || !Array.isArray(value.functions)) return false;
  const root = programNodeCountAndValidity(value.instructions);
  if (!root.valid) return false;
  const functionIds = new Set<string>();
  let total = root.count;
  for (const entry of value.functions) {
    if (!isRecord(entry) || !isSafeId(entry.id) || functionIds.has(entry.id)) return false;
    functionIds.add(entry.id);
    const body = programNodeCountAndValidity(entry.instructions);
    if (!body.valid) return false;
    total += body.count;
  }
  return total <= MAX_PROGRAM_NODES;
}

function isRuntimeState(value: unknown) {
  if (!isRecord(value) || !isRecord(value.character) || !isRecord(value.character.position)) return false;
  return isSafeId(value.character.id)
    && ["north", "east", "south", "west"].includes(String(value.character.direction))
    && isInteger(value.character.position.x)
    && isInteger(value.character.position.y)
    && Array.isArray(value.collectedItemIds)
    && value.collectedItemIds.every(isSafeId)
    && isInteger(value.collisionCount)
    && isRecord(value.commandUseCounts)
    && Object.entries(value.commandUseCounts).every(([id, count]) => SAFE_ID.test(id) && isInteger(count))
    && isInteger(value.operationCount)
    && isInteger(value.sourceCommandCount)
    && Array.isArray(value.usedConcepts)
    && value.usedConcepts.every(isSafeId);
}

function isLevelResult(value: unknown) {
  if (!isRecord(value) || !isRecord(value.metrics)) return false;
  return typeof value.valid === "boolean"
    && isSafeId(value.code)
    && typeof value.message === "string"
    && value.message.length <= 500
    && Array.isArray(value.affectedIds)
    && value.affectedIds.every(isSafeId)
    && isInteger(value.stars, 0, 3)
    && isInteger(value.metrics.commandCount)
    && isInteger(value.metrics.operationCount)
    && Array.isArray(value.metrics.usedConcepts)
    && value.metrics.usedConcepts.every(isSafeId);
}

function parseAttempt(value: unknown, path: string, courseId: string, issues: KidsProgressIssue[]): KidsAttemptRecord | null {
  if (!isRecord(value)) {
    addIssue(issues, "kids-attempt-invalid", path, "Спроба має некоректний формат.");
    return null;
  }
  let jsonLength = Number.MAX_SAFE_INTEGER;
  try {
    jsonLength = JSON.stringify(value).length;
  } catch {
    // The structured issue below is intentionally generic.
  }
  const nested = value.attempt;
  const valid = typeof value.id === "string" && UUID.test(value.id)
    && value.courseId === courseId
    && isSafeId(value.worldId)
    && isSafeId(value.levelId)
    && isDate(value.createdAt)
    && jsonLength <= MAX_ATTEMPT_JSON_LENGTH
    && isRecord(nested)
    && nested.schema === "systema.kids-level-attempt"
    && nested.schemaVersion === 1
    && isSafeId(nested.challengeId)
    && isInteger(nested.challengeContentVersion, 1)
    && isPortableProgram(nested.program)
    && isRuntimeState(nested.finalGameState)
    && isLevelResult(nested.result);
  if (!valid) {
    addIssue(issues, "kids-attempt-invalid", path, "Спроба пошкоджена або має непідтримувану версію.", isSafeId(value.levelId) ? [value.levelId] : []);
    return null;
  }
  return cloneJson(value as KidsAttemptRecord);
}

function parseUnlock(value: unknown, path: string, issues: KidsProgressIssue[]): KidsUnlockRecord | null {
  if (!isRecord(value)
    || !["world", "achievement", "reward"].includes(String(value.kind))
    || !isSafeId(value.referenceId)
    || !isDate(value.unlockedAt)) {
    addIssue(issues, "kids-unlock-invalid", path, "Unlock має некоректний формат.");
    return null;
  }
  return { kind: value.kind as KidsUnlockKind, referenceId: value.referenceId, unlockedAt: value.unlockedAt };
}

function parseBestSolution(value: unknown): KidsBestSolution | null | undefined {
  if (value === null) return null;
  if (!isRecord(value)
    || typeof value.attemptId !== "string"
    || !UUID.test(value.attemptId)
    || !isInteger(value.challengeContentVersion, 1)
    || !isPortableProgram(value.program)
    || !isInteger(value.stars, 1, 3)
    || !isInteger(value.commandCount)
    || !isDate(value.recordedAt)) return undefined;
  return cloneJson(value as KidsBestSolution);
}

function parseLevel(value: unknown, path: string, issues: KidsProgressIssue[]): KidsLevelProgress | null {
  if (!isRecord(value)) {
    addIssue(issues, "kids-level-progress-invalid", path, "Level progress має некоректний формат.");
    return null;
  }
  const bestSolution = parseBestSolution(value.bestSolution);
  if (!isSafeId(value.worldId)
    || !isSafeId(value.levelId)
    || typeof value.completed !== "boolean"
    || !isInteger(value.stars, 0, 3)
    || !isInteger(value.attemptCount)
    || bestSolution === undefined
    || !isDate(value.updatedAt)) {
    addIssue(issues, "kids-level-progress-invalid", path, "Level progress пошкоджений.", isSafeId(value.levelId) ? [value.levelId] : []);
    return null;
  }
  return {
    worldId: value.worldId,
    levelId: value.levelId,
    completed: value.completed,
    stars: value.stars as 0 | 1 | 2 | 3,
    attemptCount: value.attemptCount,
    bestSolution,
    updatedAt: value.updatedAt,
  };
}

function betterAttempt(current: KidsAttemptRecord | null, candidate: KidsAttemptRecord) {
  if (!candidate.attempt.result.valid || candidate.attempt.result.stars === 0) return current;
  if (!current) return candidate;
  const currentResult = current.attempt.result;
  const candidateResult = candidate.attempt.result;
  if (candidateResult.stars !== currentResult.stars) return candidateResult.stars > currentResult.stars ? candidate : current;
  if (candidateResult.metrics.commandCount !== currentResult.metrics.commandCount) {
    return candidateResult.metrics.commandCount < currentResult.metrics.commandCount ? candidate : current;
  }
  if (candidate.createdAt !== current.createdAt) return candidate.createdAt < current.createdAt ? candidate : current;
  return candidate.id < current.id ? candidate : current;
}

function summarizeAttempts(attempts: readonly KidsAttemptRecord[]): KidsLevelProgress[] {
  const groups = new Map<string, KidsAttemptRecord[]>();
  attempts.forEach((attempt) => {
    const key = `${attempt.worldId}:${attempt.levelId}`;
    groups.set(key, [...(groups.get(key) ?? []), attempt]);
  });
  return [...groups.values()].map((records): KidsLevelProgress => {
    const ordered = [...records].sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id));
    const bestAttempt = ordered.reduce<KidsAttemptRecord | null>(betterAttempt, null);
    const latest = ordered.at(-1) as KidsAttemptRecord;
    const stars = ordered.reduce<0 | 1 | 2 | 3>((maximum, attempt) => (
      Math.max(maximum, attempt.attempt.result.valid ? attempt.attempt.result.stars : 0) as 0 | 1 | 2 | 3
    ), 0);
    return {
      worldId: latest.worldId,
      levelId: latest.levelId,
      completed: ordered.some((attempt) => attempt.attempt.result.valid),
      stars,
      attemptCount: ordered.length,
      bestSolution: bestAttempt ? {
        attemptId: bestAttempt.id,
        challengeContentVersion: bestAttempt.attempt.challengeContentVersion,
        program: cloneJson(bestAttempt.attempt.program),
        stars: bestAttempt.attempt.result.stars as 1 | 2 | 3,
        commandCount: bestAttempt.attempt.result.metrics.commandCount,
        recordedAt: bestAttempt.createdAt,
      } : null,
      updatedAt: latest.createdAt,
    };
  }).sort((left, right) => left.worldId.localeCompare(right.worldId) || left.levelId.localeCompare(right.levelId));
}

function betterSolution(current: KidsBestSolution | null, candidate: KidsBestSolution | null) {
  if (!candidate) return current;
  if (!current) return candidate;
  if (candidate.stars !== current.stars) return candidate.stars > current.stars ? candidate : current;
  if (candidate.commandCount !== current.commandCount) return candidate.commandCount < current.commandCount ? candidate : current;
  if (candidate.recordedAt !== current.recordedAt) return candidate.recordedAt < current.recordedAt ? candidate : current;
  return candidate.attemptId < current.attemptId ? candidate : current;
}

function combineLevels(levels: readonly KidsLevelProgress[]) {
  const combined = new Map<string, KidsLevelProgress>();
  levels.forEach((level) => {
    const key = `${level.worldId}:${level.levelId}`;
    const current = combined.get(key);
    if (!current) {
      combined.set(key, cloneJson(level));
      return;
    }
    combined.set(key, {
      worldId: level.worldId,
      levelId: level.levelId,
      completed: current.completed || level.completed,
      stars: Math.max(current.stars, level.stars) as 0 | 1 | 2 | 3,
      attemptCount: Math.max(current.attemptCount, level.attemptCount),
      bestSolution: betterSolution(current.bestSolution, level.bestSolution),
      updatedAt: current.updatedAt > level.updatedAt ? current.updatedAt : level.updatedAt,
    });
  });
  return [...combined.values()].sort((left, right) => left.worldId.localeCompare(right.worldId) || left.levelId.localeCompare(right.levelId));
}

function completedWorlds(levels: readonly KidsLevelProgress[], catalog: KidsProgressCatalog | undefined, preserved: readonly string[]) {
  const completed = new Set(preserved);
  if (!catalog) return [...completed].sort();
  const completedLevels = new Set(levels.filter((level) => level.completed).map((level) => `${level.worldId}:${level.levelId}`));
  catalog.worlds.forEach((world) => {
    if (world.levelIds.length > 0 && world.levelIds.every((levelId) => completedLevels.has(`${world.id}:${levelId}`))) completed.add(world.id);
  });
  return [...completed].sort();
}

function rebuild(
  courseId: string,
  attempts: readonly KidsAttemptRecord[],
  unlocks: readonly KidsUnlockRecord[],
  updatedAt: string,
  catalog?: KidsProgressCatalog,
  preservedWorldIds: readonly string[] = [],
  preservedLevels: readonly KidsLevelProgress[] = [],
): KidsProgressBundle {
  const levels = combineLevels([...preservedLevels, ...summarizeAttempts(attempts)]);
  return {
    schema: KIDS_PROGRESS_SCHEMA,
    schemaVersion: KIDS_PROGRESS_SCHEMA_VERSION,
    courseId,
    levels,
    completedWorldIds: completedWorlds(levels, catalog, preservedWorldIds),
    attempts: [...attempts].sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id)),
    unlocks: [...unlocks].sort((left, right) => left.unlockedAt.localeCompare(right.unlockedAt) || left.referenceId.localeCompare(right.referenceId)),
    updatedAt,
  };
}

export function createEmptyKidsProgress(courseId: string, updatedAt = new Date(0).toISOString()): KidsProgressBundle {
  if (!SAFE_ID.test(courseId)) throw new Error("Invalid Kids course ID.");
  return rebuild(courseId, [], [], updatedAt);
}

export function parseKidsProgressBundle(value: unknown, catalog?: KidsProgressCatalog): KidsProgressParseResult {
  const issues: KidsProgressIssue[] = [];
  if (!isRecord(value)) return { success: false, issues: [{ code: "kids-progress-invalid", path: "$", message: "Progress має некоректний формат.", affectedIds: [] }] };
  if (value.schema !== KIDS_PROGRESS_SCHEMA) addIssue(issues, "kids-progress-schema-invalid", "$.schema", "Невідомий формат Kids progress.");
  if (value.schemaVersion !== KIDS_PROGRESS_SCHEMA_VERSION) addIssue(issues, "kids-progress-version-unsupported", "$.schemaVersion", "Версія Kids progress не підтримується.");
  if (!isSafeId(value.courseId)) addIssue(issues, "kids-progress-course-invalid", "$.courseId", "Некоректний ID курсу.");
  const courseId = isSafeId(value.courseId) ? value.courseId : "invalid-course";
  if (catalog && catalog.courseId !== courseId) addIssue(issues, "kids-progress-catalog-mismatch", "$.courseId", "Progress належить іншому курсу.", [courseId]);
  if (!Array.isArray(value.attempts) || value.attempts.length > MAX_ATTEMPTS_PER_COURSE) {
    addIssue(issues, "kids-progress-attempts-invalid", "$.attempts", `Дозволено не більше ${MAX_ATTEMPTS_PER_COURSE} attempts.`);
  }
  if (!Array.isArray(value.unlocks) || value.unlocks.length > MAX_UNLOCKS_PER_COURSE) {
    addIssue(issues, "kids-progress-unlocks-invalid", "$.unlocks", `Дозволено не більше ${MAX_UNLOCKS_PER_COURSE} unlocks.`);
  }
  if (!Array.isArray(value.levels)) addIssue(issues, "kids-progress-levels-invalid", "$.levels", "Очікується список level progress.");
  if (!isDate(value.updatedAt)) addIssue(issues, "kids-progress-date-invalid", "$.updatedAt", "Некоректна дата progress.");
  const attempts = Array.isArray(value.attempts)
    ? value.attempts.slice(0, MAX_ATTEMPTS_PER_COURSE).map((entry, index) => parseAttempt(entry, `$.attempts[${index}]`, courseId, issues)).filter((entry): entry is KidsAttemptRecord => Boolean(entry))
    : [];
  const attemptIds = new Set<string>();
  attempts.forEach((attempt, index) => {
    if (attemptIds.has(attempt.id)) addIssue(issues, "kids-attempt-duplicate", `$.attempts[${index}].id`, "Attempt ID повторюється.", [attempt.id]);
    attemptIds.add(attempt.id);
  });
  const unlocks = Array.isArray(value.unlocks)
    ? value.unlocks.slice(0, MAX_UNLOCKS_PER_COURSE).map((entry, index) => parseUnlock(entry, `$.unlocks[${index}]`, issues)).filter((entry): entry is KidsUnlockRecord => Boolean(entry))
    : [];
  const unlockKeys = new Set<string>();
  unlocks.forEach((unlock, index) => {
    const key = `${unlock.kind}:${unlock.referenceId}`;
    if (unlockKeys.has(key)) addIssue(issues, "kids-unlock-duplicate", `$.unlocks[${index}]`, "Unlock повторюється.", [unlock.referenceId]);
    unlockKeys.add(key);
  });
  const preservedWorldIds = Array.isArray(value.completedWorldIds) && value.completedWorldIds.every(isSafeId)
    ? value.completedWorldIds
    : [];
  const levels = Array.isArray(value.levels)
    ? value.levels.map((entry, index) => parseLevel(entry, `$.levels[${index}]`, issues)).filter((entry): entry is KidsLevelProgress => Boolean(entry))
    : [];
  if (issues.length > 0) return { success: false, issues };
  return { success: true, data: rebuild(courseId, attempts, unlocks, value.updatedAt as string, catalog, preservedWorldIds, levels) };
}

export function mergeKidsProgressBundles(
  local: KidsProgressBundle,
  incoming: KidsProgressBundle,
  catalog?: KidsProgressCatalog,
): KidsProgressBundle {
  if (local.courseId !== incoming.courseId) throw new Error("Cannot merge progress from different courses.");
  const attempts = new Map(local.attempts.map((attempt) => [attempt.id, attempt]));
  incoming.attempts.forEach((attempt) => {
    if (!attempts.has(attempt.id)) attempts.set(attempt.id, attempt);
  });
  const unlocks = new Map(local.unlocks.map((unlock) => [`${unlock.kind}:${unlock.referenceId}`, unlock]));
  incoming.unlocks.forEach((unlock) => {
    const key = `${unlock.kind}:${unlock.referenceId}`;
    const current = unlocks.get(key);
    if (!current || unlock.unlockedAt < current.unlockedAt) unlocks.set(key, unlock);
  });
  const updatedAt = local.updatedAt > incoming.updatedAt ? local.updatedAt : incoming.updatedAt;
  return rebuild(
    local.courseId,
    [...attempts.values()],
    [...unlocks.values()],
    updatedAt,
    catalog,
    [...local.completedWorldIds, ...incoming.completedWorldIds],
    [...local.levels, ...incoming.levels],
  );
}

export function recordKidsAttempt(
  bundle: KidsProgressBundle,
  attempt: KidsAttemptRecord,
  catalog?: KidsProgressCatalog,
): KidsProgressBundle {
  const parsed = parseKidsProgressBundle({
    schema: KIDS_PROGRESS_SCHEMA,
    schemaVersion: KIDS_PROGRESS_SCHEMA_VERSION,
    courseId: bundle.courseId,
    levels: [],
    completedWorldIds: [],
    attempts: [attempt],
    unlocks: [],
    updatedAt: attempt.createdAt,
  }, catalog);
  if (!parsed.success) throw new Error("Invalid Kids attempt.");
  return mergeKidsProgressBundles(bundle, parsed.data, catalog);
}

export function recordKidsUnlock(
  bundle: KidsProgressBundle,
  unlock: KidsUnlockRecord,
  catalog?: KidsProgressCatalog,
): KidsProgressBundle {
  const parsed = parseKidsProgressBundle({
    schema: KIDS_PROGRESS_SCHEMA,
    schemaVersion: KIDS_PROGRESS_SCHEMA_VERSION,
    courseId: bundle.courseId,
    levels: [],
    completedWorldIds: [],
    attempts: [],
    unlocks: [unlock],
    updatedAt: unlock.unlockedAt,
  }, catalog);
  if (!parsed.success) throw new Error("Invalid Kids unlock.");
  return mergeKidsProgressBundles(bundle, parsed.data, catalog);
}
