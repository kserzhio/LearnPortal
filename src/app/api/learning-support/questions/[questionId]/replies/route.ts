import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request, { params }: { params: Promise<{ questionId: string }> }) {
  const { questionId } = await params;
  const supabase = await createSupabaseServerClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!supabase || !user) return NextResponse.json({ error: "Увійди, щоб відповісти." }, { status: 401 });
  const input = await request.json().catch(() => null) as { body?: unknown } | null;
  const body = typeof input?.body === "string" ? input.body.trim() : "";
  if (!UUID.test(questionId) || body.length < 2 || body.length > 4000) return NextResponse.json({ error: "Відповідь має містити від 2 до 4000 символів." }, { status: 400 });
  const profile = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
  const metadataName = user.user_metadata.full_name ?? user.user_metadata.name;
  const authorName = profile.data?.display_name?.trim() || (typeof metadataName === "string" ? metadataName.slice(0, 80) : "Студент");
  const { error } = await supabase.from("lesson_replies").insert({ question_id: questionId, user_id: user.id, author_name: authorName, body, is_official_answer: false });
  return error ? NextResponse.json({ error: "Не вдалося опублікувати відповідь." }, { status: 500 }) : NextResponse.json({ ok: true }, { status: 201 });
}
