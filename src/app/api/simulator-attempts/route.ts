import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  evaluateFinalDesign,
  FINAL_DESIGN_COURSE_ID,
  FINAL_DESIGN_LESSON_ID,
  FINAL_DESIGN_SCHEMA_VERSION,
  FINAL_DESIGN_SIMULATOR_ID,
  parseFinalDesignState,
} from "@/lib/simulators/final-system-design";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return json({ authenticated: false, attempts: [] });
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return json({ authenticated: false, attempts: [] });

  const { data, error } = await supabase
    .from("simulator_attempts")
    .select("id, validation_code, score, created_at")
    .eq("user_id", userData.user.id)
    .eq("course_id", FINAL_DESIGN_COURSE_ID)
    .eq("lesson_id", FINAL_DESIGN_LESSON_ID)
    .eq("simulator_id", FINAL_DESIGN_SIMULATOR_ID)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return json({ error: "Не вдалося завантажити спроби." }, 500);
  return json({
    authenticated: true,
    attempts: (data ?? []).map((attempt) => ({
      id: attempt.id,
      validationCode: attempt.validation_code,
      score: Number(attempt.score),
      createdAt: attempt.created_at,
    })),
  });
}

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return json({ error: "Запит відхилено." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return json({ error: "Очікується JSON." }, 415);

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
  const input = body as { id?: unknown; state?: unknown };
  const state = parseFinalDesignState(input.state);
  if (typeof input.id !== "string" || !UUID.test(input.id) || !state) return json({ error: "Некоректна спроба." }, 400);

  const evaluation = evaluateFinalDesign(state);
  const { error } = await supabase.from("simulator_attempts").upsert({
    id: input.id,
    user_id: userData.user.id,
    course_id: FINAL_DESIGN_COURSE_ID,
    lesson_id: FINAL_DESIGN_LESSON_ID,
    simulator_id: FINAL_DESIGN_SIMULATOR_ID,
    schema_version: FINAL_DESIGN_SCHEMA_VERSION,
    state,
    validation_code: evaluation.code,
    score: evaluation.score,
  }, { onConflict: "id" });

  if (error) return json({ error: "Не вдалося зберегти спробу." }, 500);
  return json({ attempt: { id: input.id, validationCode: evaluation.code, score: evaluation.score } });
}
