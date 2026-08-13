import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { findKnowledgeCheck } from "@/features/learning-support/content";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function POST(request: Request) {
  const input = await request.json().catch(() => null) as { courseId?: unknown; contentId?: unknown; checkId?: unknown; selectedAnswer?: unknown } | null;
  const courseId = typeof input?.courseId === "string" ? input.courseId : "";
  const contentId = typeof input?.contentId === "string" ? input.contentId : "";
  const checkId = typeof input?.checkId === "string" ? input.checkId : "";
  const selectedAnswer = typeof input?.selectedAnswer === "string" ? input.selectedAnswer : "";
  if (![courseId, contentId, checkId].every((value) => ID.test(value)) || selectedAnswer.length > 100) return NextResponse.json({ error: "Некоректна відповідь." }, { status: 400 });
  const check = findKnowledgeCheck(courseId, contentId, checkId);
  if (!check || !check.options.some((option) => option.id === selectedAnswer)) return NextResponse.json({ error: "Перевірку не знайдено." }, { status: 404 });
  const correct = selectedAnswer === check.correctAnswer;
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    const user = (await supabase.auth.getUser()).data.user;
    const cookieStore = await cookies();
    const existingKey = cookieStore.get("systema_learning_key")?.value;
    const anonymousKey = existingKey && /^[0-9a-f-]{36}$/i.test(existingKey) ? existingKey : crypto.randomUUID();
    const identity = user ? { user_id: user.id, anonymous_key: null } : { user_id: null, anonymous_key: anonymousKey };
    const { error } = await supabase.from("knowledge_check_attempts").insert({ course_id: courseId, content_id: contentId, check_id: checkId, selected_answer: selectedAnswer, correct, ...identity });
    const response = NextResponse.json({ correct, explanation: correct ? check.explanation : check.incorrectExplanation, persisted: !error });
    if (!user && !existingKey) response.cookies.set("systema_learning_key", anonymousKey, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 31_536_000, path: "/" });
    return response;
  }
  return NextResponse.json({ correct, explanation: correct ? check.explanation : check.incorrectExplanation });
}
