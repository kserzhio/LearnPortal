import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const json = (body: unknown, status = 200) => NextResponse.json(body, { status });

export async function PATCH(request: Request, { params }: { params: Promise<{ questionId: string }> }) {
  const { questionId } = await params;
  if (!UUID.test(questionId)) return json({ error: "Некоректне питання." }, 400);
  const supabase = await createSupabaseServerClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!supabase || !user) return json({ error: "Потрібно увійти." }, 401);
  const input = await request.json().catch(() => null) as { action?: unknown; replyId?: unknown } | null;
  if (input?.action === "toggle-resolved") {
    const current = await supabase.from("lesson_questions").select("status").eq("id", questionId).single();
    const { error } = await supabase.from("lesson_questions").update({ status: current.data?.status === "resolved" ? "open" : "resolved", updated_at: new Date().toISOString() }).eq("id", questionId);
    return error ? json({ error: "Не вдалося змінити статус." }, 403) : json({ ok: true });
  }
  if (input?.action === "toggle-official" && typeof input.replyId === "string" && UUID.test(input.replyId)) {
    const current = await supabase.from("lesson_replies").select("is_official_answer").eq("id", input.replyId).eq("question_id", questionId).single();
    const { error } = await supabase.from("lesson_replies").update({ is_official_answer: !current.data?.is_official_answer, updated_at: new Date().toISOString() }).eq("id", input.replyId).eq("question_id", questionId);
    return error ? json({ error: "Не вдалося позначити відповідь." }, 403) : json({ ok: true });
  }
  return json({ error: "Невідома дія." }, 400);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ questionId: string }> }) {
  const { questionId } = await params;
  const supabase = await createSupabaseServerClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!supabase || !user || !UUID.test(questionId)) return json({ error: "Дію не дозволено." }, 401);
  const { error } = await supabase.from("lesson_questions").delete().eq("id", questionId);
  return error ? json({ error: "Не вдалося видалити питання." }, 403) : json({ ok: true });
}
