import { NextResponse } from "next/server";
import { getCourseLessons } from "@/content/courses";
import { highLoadArchitectureCourse } from "@/content/courses/high-load-architecture";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const PREVIEW_LESSON_COUNT = 1;
const FULL_LESSON_COUNT = getCourseLessons(highLoadArchitectureCourse.id).length;

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const authenticated = Boolean(user);

  return NextResponse.json({
    authenticated,
    access: authenticated ? "full" : "preview",
    accessibleLessonCount: authenticated ? FULL_LESSON_COUNT : PREVIEW_LESSON_COUNT,
  }, { headers: { "Cache-Control": "no-store" } });
}
