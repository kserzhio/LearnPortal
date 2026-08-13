import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const json = (body: unknown, status = 200) => NextResponse.json(body, { status });

export async function PATCH(request: Request, { params }: { params: Promise<{ replyId: string }> }) {
  const { replyId } = await params;
  const supabase = await createSupabaseServerClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!supabase || !user || !UUID.test(replyId)) return json({ error: "Потрібно увійти." }, 401);
  const input = await request.json().catch(() => null) as { useful?: unknown } | null;
  if (typeof input?.useful !== "boolean") return json({ error: "Некоректна дія." }, 400);
  const query = input.useful
    ? supabase.from("reply_useful_votes").upsert({ reply_id: replyId, user_id: user.id }, { onConflict: "reply_id,user_id" })
    : supabase.from("reply_useful_votes").delete().eq("reply_id", replyId).eq("user_id", user.id);
  const { error } = await query;
  return error ? json({ error: "Не вдалося зберегти реакцію." }, 500) : json({ ok: true });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ replyId: string }> }) {
  const { replyId } = await params;
  const supabase = await createSupabaseServerClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!supabase || !user || !UUID.test(replyId)) return json({ error: "Дію не дозволено." }, 401);
  const { error } = await supabase.from("lesson_replies").delete().eq("id", replyId);
  return error ? json({ error: "Не вдалося видалити відповідь." }, 403) : json({ ok: true });
}
