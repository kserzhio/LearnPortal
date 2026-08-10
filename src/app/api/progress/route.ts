import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { LessonProgressRecord } from "@/lib/progress/types";

const MAX_PROGRESS_RECORDS = 100;
const SAFE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type ProgressInput = Pick<LessonProgressRecord, "courseId" | "lessonId" | "completed" | "position" | "updatedAt">;

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function isProgressInput(value: unknown): value is ProgressInput {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.courseId === "string"
    && SAFE_ID.test(record.courseId)
    && typeof record.lessonId === "string"
    && SAFE_ID.test(record.lessonId)
    && typeof record.completed === "boolean"
    && typeof record.position === "number"
    && Number.isFinite(record.position)
    && record.position >= 0
    && record.position <= 1
    && typeof record.updatedAt === "string"
    && !Number.isNaN(Date.parse(record.updatedAt));
}

export async function GET(request: Request) {
  const courseId = new URL(request.url).searchParams.get("courseId") ?? "";
  if (!SAFE_ID.test(courseId)) return json({ error: "Некоректний ідентифікатор курсу." }, 400);

  const supabase = await createSupabaseServerClient();
  if (!supabase) return json({ authenticated: false, records: [] });

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return json({ authenticated: false, records: [] });

  const { data, error } = await supabase
    .from("lesson_progress")
    .select("course_id, lesson_id, completed, position, updated_at")
    .eq("user_id", userData.user.id)
    .eq("course_id", courseId);

  if (error) return json({ error: "Не вдалося завантажити прогрес." }, 500);

  const records: LessonProgressRecord[] = (data ?? []).map((record) => ({
    courseId: record.course_id,
    lessonId: record.lesson_id,
    completed: record.completed,
    position: Number(record.position),
    updatedAt: record.updated_at,
  }));

  return json({ authenticated: true, records });
}

export async function PUT(request: Request) {
  const requestUrl = new URL(request.url);
  if (request.headers.get("origin") !== requestUrl.origin) {
    return json({ error: "Запит відхилено." }, 403);
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return json({ error: "Очікується JSON." }, 415);
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return json({ error: "Синхронізація ще не налаштована." }, 503);

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return json({ error: "Потрібно увійти для синхронізації." }, 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Некоректний JSON." }, 400);
  }

  const records = (body as { records?: unknown })?.records;
  if (!Array.isArray(records) || records.length === 0 || records.length > MAX_PROGRESS_RECORDS || !records.every(isProgressInput)) {
    return json({ error: "Некоректні дані прогресу." }, 400);
  }

  const lessonIds = [...new Set(records.map((record) => record.lessonId))];
  const { data: lessons, error: lessonsError } = await supabase
    .from("lessons")
    .select("id, course_id")
    .in("id", lessonIds);

  if (lessonsError) return json({ error: "Не вдалося перевірити заняття." }, 500);
  const validLessons = new Set((lessons ?? []).map((lesson) => `${lesson.course_id}:${lesson.id}`));
  if (records.some((record) => !validLessons.has(`${record.courseId}:${record.lessonId}`))) {
    return json({ error: "Заняття не належить вказаному курсу." }, 400);
  }

  const rows = records.map((record) => ({
    user_id: userData.user.id,
    course_id: record.courseId,
    lesson_id: record.lessonId,
    completed: record.completed,
    position: record.position,
    completed_at: record.completed ? record.updatedAt : null,
    updated_at: record.updatedAt,
  }));
  const { error } = await supabase
    .from("lesson_progress")
    .upsert(rows, { onConflict: "user_id,course_id,lesson_id" });

  if (error) return json({ error: "Не вдалося синхронізувати прогрес." }, 500);
  return json({ synchronized: records.length });
}
