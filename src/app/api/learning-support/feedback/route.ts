import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const CONTENT_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const allowedReasons = new Set(["too-hard", "unclear", "practice-broken", "too-much", "other"]);

export async function POST(request: Request) {
  const input = await request.json().catch(() => null) as { courseId?: unknown; contentId?: unknown; helpful?: unknown; reasons?: unknown; comment?: unknown } | null;
  const courseId = typeof input?.courseId === "string" ? input.courseId : "";
  const contentId = typeof input?.contentId === "string" ? input.contentId : "";
  const reasons = Array.isArray(input?.reasons) ? input.reasons.filter((item): item is string => typeof item === "string" && allowedReasons.has(item)) : [];
  const comment = typeof input?.comment === "string" ? input.comment.trim().slice(0, 1000) : "";
  if (!CONTENT_ID.test(courseId) || !CONTENT_ID.test(contentId) || typeof input?.helpful !== "boolean") return NextResponse.json({ error: "Некоректний feedback." }, { status: 400 });
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Збереження тимчасово недоступне." }, { status: 503 });
  const user = (await supabase.auth.getUser()).data.user;
  const cookieStore = await cookies();
  const existingKey = cookieStore.get("systema_feedback_key")?.value;
  const anonymousKey = existingKey && /^[0-9a-f-]{36}$/i.test(existingKey) ? existingKey : crypto.randomUUID();
  const identity = user
    ? { user_id: user.id, anonymous_key: null, subject_key: user.id }
    : { user_id: null, anonymous_key: anonymousKey, subject_key: anonymousKey };
  const payload: Record<string, unknown> = { course_id: courseId, content_id: contentId, helpful: input.helpful, reasons: input.helpful ? [] : reasons, comment: comment || null, updated_at: new Date().toISOString(), ...identity };
  const { error } = await supabase.from("lesson_feedback").upsert(payload, { onConflict: "subject_key,course_id,content_id" });
  if (error) return NextResponse.json({ error: "Не вдалося зберегти feedback." }, { status: 500 });
  const response = NextResponse.json({ ok: true });
  if (!user && !existingKey) response.cookies.set("systema_feedback_key", anonymousKey, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 31_536_000, path: "/" });
  return response;
}
