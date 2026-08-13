import { NextResponse } from "next/server";
import { getKidsChallenge } from "@/features/kids-coding/content";
import { createGameExecutionEngine } from "@/features/kids-coding/engine";
import {
  KIDS_PROGRESS_SCHEMA,
  KIDS_PROGRESS_SCHEMA_VERSION,
  parseKidsProgressBundle,
  type KidsAttemptRecord,
  type KidsProgressBundle,
  type KidsUnlockRecord,
} from "@/features/kids-coding/progress";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const SAFE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_REQUEST_BYTES = 1_000_000;
const MAX_SYNC_ATTEMPTS = 50;
const MAX_RETURNED_ATTEMPTS = 200;
const EARLIEST_ATTEMPT_TIME = Date.parse("2025-01-01T00:00:00.000Z");

type ServerSupabaseClient = NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>;

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function sameOrigin(request: Request) {
  return request.headers.get("origin") === new URL(request.url).origin;
}

async function readJson(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_REQUEST_BYTES) return { error: json({ error: "Дані прогресу завеликі для одного запиту." }, 413) } as const;
  if (!request.headers.get("content-type")?.startsWith("application/json")) return { error: json({ error: "Очікується JSON." }, 415) } as const;
  try {
    return { body: await request.json() } as const;
  } catch {
    return { error: json({ error: "Некоректний JSON." }, 400) } as const;
  }
}

async function authenticatedClient() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user ? { supabase, userId: data.user.id } : null;
}

function latestDate(values: readonly (string | null | undefined)[]) {
  return values.filter((value): value is string => Boolean(value)).sort().at(-1) ?? new Date(0).toISOString();
}

async function loadBundle(supabase: ServerSupabaseClient, userId: string, courseId: string): Promise<KidsProgressBundle | null> {
  const [worldResult, levelCatalogResult, progressResult, attemptResult, unlockResult] = await Promise.all([
    supabase.from("course_worlds").select("id, position").eq("course_id", courseId).eq("status", "published").order("position"),
    supabase.from("course_levels").select("id, world_id, position").eq("course_id", courseId).eq("status", "published").order("position"),
    supabase.from("kids_level_progress").select(
      "world_id, level_id, completed, stars, attempt_count, best_attempt_id, best_stars, best_command_count, best_challenge_content_version, best_program, best_recorded_at, updated_at",
    ).eq("user_id", userId).eq("course_id", courseId),
    supabase.from("kids_level_attempts").select("id, world_id, level_id, attempt_payload, created_at")
      .eq("user_id", userId).eq("course_id", courseId).order("created_at", { ascending: false }).limit(MAX_RETURNED_ATTEMPTS),
    supabase.from("kids_unlocks").select("unlock_kind, reference_id, unlocked_at")
      .eq("user_id", userId).eq("course_id", courseId).order("unlocked_at"),
  ]);
  if (worldResult.error || levelCatalogResult.error || progressResult.error || attemptResult.error || unlockResult.error) return null;
  if ((worldResult.data ?? []).length === 0) return null;

  const levels = (progressResult.data ?? []).map((row) => ({
    worldId: row.world_id,
    levelId: row.level_id,
    completed: row.completed,
    stars: Number(row.stars) as 0 | 1 | 2 | 3,
    attemptCount: Number(row.attempt_count),
    bestSolution: row.best_attempt_id && row.best_program ? {
      attemptId: row.best_attempt_id,
      challengeContentVersion: Number(row.best_challenge_content_version),
      program: row.best_program,
      stars: Number(row.best_stars) as 1 | 2 | 3,
      commandCount: Number(row.best_command_count),
      recordedAt: row.best_recorded_at,
    } : null,
    updatedAt: row.updated_at,
  }));
  const attempts = (attemptResult.data ?? []).map((row) => ({
    id: row.id,
    courseId,
    worldId: row.world_id,
    levelId: row.level_id,
    createdAt: row.created_at,
    attempt: row.attempt_payload,
  }));
  const unlocks: KidsUnlockRecord[] = (unlockResult.data ?? []).map((row) => ({
    kind: row.unlock_kind as KidsUnlockRecord["kind"],
    referenceId: row.reference_id,
    unlockedAt: row.unlocked_at,
  }));
  const firstWorld = (worldResult.data ?? [])[0];
  if (firstWorld && !unlocks.some((unlock) => unlock.kind === "world" && unlock.referenceId === firstWorld.id)) {
    unlocks.push({ kind: "world", referenceId: firstWorld.id, unlockedAt: new Date(0).toISOString() });
  }
  const completedLevelKeys = new Set(levels.filter((level) => level.completed).map((level) => `${level.worldId}:${level.levelId}`));
  const completedWorldIds = (worldResult.data ?? []).filter((world) => {
    const worldLevels = (levelCatalogResult.data ?? []).filter((level) => level.world_id === world.id);
    return worldLevels.length > 0 && worldLevels.every((level) => completedLevelKeys.has(`${world.id}:${level.id}`));
  }).map((world) => world.id);
  const updatedAt = latestDate([
    ...levels.map((level) => level.updatedAt),
    ...attempts.map((attempt) => attempt.createdAt),
    ...unlocks.map((unlock) => unlock.unlockedAt),
  ]);
  const candidate = {
    schema: KIDS_PROGRESS_SCHEMA,
    schemaVersion: KIDS_PROGRESS_SCHEMA_VERSION,
    courseId,
    levels,
    completedWorldIds,
    attempts,
    unlocks,
    updatedAt,
  };
  const parsed = parseKidsProgressBundle(candidate);
  return parsed.success ? parsed.data : null;
}

async function verifyAttempt(attempt: KidsAttemptRecord): Promise<KidsAttemptRecord | null> {
  const challenge = getKidsChallenge(attempt.courseId, attempt.worldId, attempt.levelId);
  if (!challenge || challenge.id !== attempt.attempt.challengeId || challenge.contentVersion !== attempt.attempt.challengeContentVersion) return null;
  const createdTime = Date.parse(attempt.createdAt);
  if (createdTime < EARLIEST_ATTEMPT_TIME || createdTime > Date.now() + 300_000) return null;
  const engine = createGameExecutionEngine({ challenge });
  const loaded = engine.load(attempt.attempt.program);
  if (loaded.status !== "ready") return null;
  await engine.run({ stepDelayMs: 0 });
  const verified = engine.serializeAttempt();
  if (!verified) return null;
  return { ...attempt, attempt: verified };
}

async function insertAttempts(supabase: ServerSupabaseClient, userId: string, attempts: readonly KidsAttemptRecord[]) {
  const verified: KidsAttemptRecord[] = [];
  for (const attempt of attempts) {
    const result = await verifyAttempt(attempt);
    if (!result) return { error: "Спроба не відповідає поточній версії рівня." } as const;
    verified.push(result);
  }
  if (verified.length === 0) return { synchronized: 0 } as const;
  const rows = verified.map((record) => ({
    id: record.id,
    user_id: userId,
    course_id: record.courseId,
    world_id: record.worldId,
    level_id: record.levelId,
    challenge_id: record.attempt.challengeId,
    challenge_content_version: record.attempt.challengeContentVersion,
    program_schema: record.attempt.program.schema,
    program_schema_version: record.attempt.program.schemaVersion,
    program: record.attempt.program,
    attempt_payload: record.attempt,
    validation_code: record.attempt.result.code,
    valid: record.attempt.result.valid,
    stars: record.attempt.result.stars,
    command_count: record.attempt.result.metrics.commandCount,
    operation_count: record.attempt.result.metrics.operationCount,
    used_concepts: record.attempt.result.metrics.usedConcepts,
    created_at: record.createdAt,
  }));
  const { error } = await supabase.from("kids_level_attempts").upsert(rows, { onConflict: "id", ignoreDuplicates: true });
  return error ? { error: "Не вдалося зберегти Kids attempts." } as const : { synchronized: rows.length } as const;
}

async function claimWorld(supabase: ServerSupabaseClient, courseId: string, unlock: KidsUnlockRecord) {
  if (unlock.kind !== "world") return { error: "Achievements і rewards відкриватимуться лише через перевірені правила рівня." } as const;
  const { error } = await supabase.rpc("claim_kids_world_unlock", { p_course_id: courseId, p_world_id: unlock.referenceId });
  return error ? { error: "Цей світ ще не відкрито." } as const : { synchronized: 1 } as const;
}

export async function GET(request: Request) {
  const courseId = new URL(request.url).searchParams.get("courseId") ?? "";
  if (!SAFE_ID.test(courseId)) return json({ error: "Некоректний ID курсу." }, 400);
  const auth = await authenticatedClient();
  if (!auth) return json({ error: "Потрібно увійти для синхронізації." }, 401);
  const bundle = await loadBundle(auth.supabase, auth.userId, courseId);
  return bundle ? json({ bundle }) : json({ error: "Kids course не знайдено або progress недоступний." }, 404);
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: "Запит відхилено." }, 403);
  const auth = await authenticatedClient();
  if (!auth) return json({ error: "Потрібно увійти для синхронізації." }, 401);
  const parsedRequest = await readJson(request);
  if ("error" in parsedRequest) return parsedRequest.error;
  const input = parsedRequest.body as { action?: unknown; attempt?: unknown; courseId?: unknown; unlock?: unknown };

  let courseId = "";
  if (input.action === "record-attempt" && input.attempt && typeof input.attempt === "object") {
    courseId = String((input.attempt as { courseId?: unknown }).courseId ?? "");
    const candidate = {
      schema: KIDS_PROGRESS_SCHEMA, schemaVersion: 1, courseId, levels: [], completedWorldIds: [],
      attempts: [input.attempt], unlocks: [], updatedAt: (input.attempt as { createdAt?: unknown }).createdAt,
    };
    const progress = parseKidsProgressBundle(candidate);
    if (!progress.success) return json({ error: "Некоректна Kids attempt." }, 400);
    const inserted = await insertAttempts(auth.supabase, auth.userId, progress.data.attempts);
    if ("error" in inserted) return json({ error: inserted.error }, 400);
  } else if (input.action === "record-unlock" && typeof input.courseId === "string") {
    courseId = input.courseId;
    const candidate = {
      schema: KIDS_PROGRESS_SCHEMA, schemaVersion: 1, courseId, levels: [], completedWorldIds: [], attempts: [],
      unlocks: [input.unlock], updatedAt: (input.unlock as { unlockedAt?: unknown } | undefined)?.unlockedAt,
    };
    const progress = parseKidsProgressBundle(candidate);
    if (!progress.success) return json({ error: "Некоректний unlock." }, 400);
    const claimed = await claimWorld(auth.supabase, courseId, progress.data.unlocks[0]);
    if ("error" in claimed) return json({ error: claimed.error }, 403);
  } else {
    return json({ error: "Невідома операція Kids progress." }, 400);
  }
  const bundle = await loadBundle(auth.supabase, auth.userId, courseId);
  return bundle ? json({ bundle }) : json({ error: "Не вдалося прочитати оновлений progress." }, 500);
}

export async function PUT(request: Request) {
  if (!sameOrigin(request)) return json({ error: "Запит відхилено." }, 403);
  const auth = await authenticatedClient();
  if (!auth) return json({ error: "Потрібно увійти для синхронізації." }, 401);
  const parsedRequest = await readJson(request);
  if ("error" in parsedRequest) return parsedRequest.error;
  const input = parsedRequest.body as { bundle?: unknown };
  const progress = parseKidsProgressBundle(input.bundle);
  if (!progress.success || progress.data.attempts.length > MAX_SYNC_ATTEMPTS) return json({ error: "Некоректний або завеликий пакет Kids progress." }, 400);

  const inserted = await insertAttempts(auth.supabase, auth.userId, progress.data.attempts);
  if ("error" in inserted) return json({ error: inserted.error }, 400);
  for (const unlock of progress.data.unlocks) {
    const claimed = await claimWorld(auth.supabase, progress.data.courseId, unlock);
    if ("error" in claimed && unlock.kind === "world") return json({ error: claimed.error }, 403);
  }
  const bundle = await loadBundle(auth.supabase, auth.userId, progress.data.courseId);
  return bundle ? json({ bundle }) : json({ error: "Не вдалося прочитати синхронізований progress." }, 500);
}
