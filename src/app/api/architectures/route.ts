import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  FINAL_DESIGN_COURSE_ID,
  FINAL_DESIGN_LESSON_ID,
  FINAL_DESIGN_SCHEMA_VERSION,
  parseFinalDesignState,
} from "@/lib/simulators/final-system-design";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function sameOrigin(request: Request) {
  return request.headers.get("origin") === new URL(request.url).origin;
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return json({ authenticated: false, architectures: [] });
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return json({ authenticated: false, architectures: [] });

  const { data, error } = await supabase
    .from("saved_architectures")
    .select("id, title, diagram, schema_version, created_at, updated_at")
    .eq("user_id", userData.user.id)
    .eq("course_id", FINAL_DESIGN_COURSE_ID)
    .eq("lesson_id", FINAL_DESIGN_LESSON_ID)
    .order("updated_at", { ascending: false })
    .limit(20);

  if (error) return json({ error: "Не вдалося завантажити архітектури." }, 500);
  return json({
    authenticated: true,
    architectures: (data ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      state: item.diagram,
      schemaVersion: item.schema_version,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    })),
  });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: "Запит відхилено." }, 403);
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
  const input = body as { id?: unknown; title?: unknown; state?: unknown };
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const state = parseFinalDesignState(input.state);
  if (typeof input.id !== "string" || !UUID.test(input.id) || title.length < 1 || title.length > 120 || !state) {
    return json({ error: "Некоректна архітектура." }, 400);
  }

  const timestamp = new Date().toISOString();
  const { data, error } = await supabase.from("saved_architectures").upsert({
    id: input.id,
    user_id: userData.user.id,
    course_id: FINAL_DESIGN_COURSE_ID,
    lesson_id: FINAL_DESIGN_LESSON_ID,
    title,
    schema_version: FINAL_DESIGN_SCHEMA_VERSION,
    diagram: state,
    updated_at: timestamp,
  }, { onConflict: "id" }).select("id, title, diagram, schema_version, created_at, updated_at").single();

  if (error || !data) return json({ error: "Не вдалося зберегти архітектуру." }, 500);
  return json({
    architecture: {
      id: data.id,
      title: data.title,
      state: data.diagram,
      schemaVersion: data.schema_version,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    },
  });
}
