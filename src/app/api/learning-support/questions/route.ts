import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const CONTENT_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const questionTypes = new Set(["question", "idea", "lesson-problem"]);

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const courseId = url.searchParams.get("courseId") ?? "";
  const contentId = url.searchParams.get("contentId") ?? "";
  if (!CONTENT_ID.test(courseId) || !CONTENT_ID.test(contentId)) return json({ error: "Некоректний урок." }, 400);
  const supabase = await createSupabaseServerClient();
  if (!supabase) return json({ questions: [], authenticated: false, moderator: false });
  const user = (await supabase.auth.getUser()).data.user;
  const [{ data, error }, profileResult] = await Promise.all([
    supabase.from("lesson_questions").select("id, user_id, author_name, type, title, body, status, created_at, lesson_replies(id, user_id, author_name, body, is_official_answer, created_at)").eq("course_id", courseId).eq("content_id", contentId).order("created_at", { ascending: false }),
    user ? supabase.from("profiles").select("role").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  if (error) return json({ questions: [], authenticated: Boolean(user), userId: user?.id ?? null, moderator: false });
  const replyIds = (data ?? []).flatMap((question) => question.lesson_replies.map((reply) => reply.id));
  const [countsResult, votesResult] = replyIds.length > 0 ? await Promise.all([
    supabase.from("reply_useful_counts").select("reply_id, useful_count").in("reply_id", replyIds),
    user ? supabase.from("reply_useful_votes").select("reply_id").eq("user_id", user.id).in("reply_id", replyIds) : Promise.resolve({ data: [] }),
  ]) : [{ data: [] }, { data: [] }];
  const counts = new Map((countsResult.data ?? []).map((item) => [item.reply_id, item.useful_count]));
  const voted = new Set((votesResult.data ?? []).map((item) => item.reply_id));
  const questions = (data ?? []).map((question) => ({
    id: question.id, author_name: question.author_name, type: question.type, title: question.title, body: question.body,
    status: question.status, created_at: question.created_at, is_owner: question.user_id === user?.id,
    lesson_replies: question.lesson_replies.map((reply) => ({ id: reply.id, author_name: reply.author_name, body: reply.body, is_official_answer: reply.is_official_answer, created_at: reply.created_at, is_owner: reply.user_id === user?.id, useful_count: counts.get(reply.id) ?? 0, useful_by_user: voted.has(reply.id) })),
  }));
  const moderator = ["INSTRUCTOR", "ADMIN"].includes(profileResult.data?.role ?? "");
  return json({ questions, authenticated: Boolean(user), moderator });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!supabase || !user) return json({ error: "Увійди, щоб поставити питання." }, 401);
  const input = await request.json().catch(() => null) as { courseId?: unknown; contentId?: unknown; type?: unknown; title?: unknown; body?: unknown } | null;
  const courseId = typeof input?.courseId === "string" ? input.courseId : "";
  const contentId = typeof input?.contentId === "string" ? input.contentId : "";
  const type = typeof input?.type === "string" ? input.type : "";
  const title = typeof input?.title === "string" ? input.title.trim() : "";
  const body = typeof input?.body === "string" ? input.body.trim() : "";
  if (!CONTENT_ID.test(courseId) || !CONTENT_ID.test(contentId) || !questionTypes.has(type) || title.length < 5 || title.length > 140 || body.length < 10 || body.length > 4000) {
    return json({ error: "Перевір тип, заголовок та опис питання." }, 400);
  }
  const profile = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
  const metadataName = user.user_metadata.full_name ?? user.user_metadata.name;
  const authorName = profile.data?.display_name?.trim() || (typeof metadataName === "string" ? metadataName.slice(0, 80) : "Студент");
  const { error } = await supabase.from("lesson_questions").insert({ course_id: courseId, content_id: contentId, user_id: user.id, author_name: authorName, type, title, body });
  if (error) return json({ error: process.env.NODE_ENV === "production" ? "Не вдалося опублікувати питання." : `Не вдалося опублікувати питання (${error.code}).` }, 500);
  return json({ ok: true }, 201);
}
