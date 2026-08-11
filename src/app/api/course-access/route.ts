import { NextResponse } from "next/server";
import { getCourseLessons } from "@/content/courses";
import { highLoadArchitectureCourse } from "@/content/courses/high-load-architecture";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const PREVIEW_LESSON_COUNT = 1;
const FULL_LESSON_COUNT = getCourseLessons(highLoadArchitectureCourse.id).length;

function getAccessibleModules(lessonLimit: number) {
  return highLoadArchitectureCourse.modules
    .map((courseModule) => ({
      id: courseModule.id,
      position: courseModule.position,
      title: courseModule.title,
      lessons: courseModule.lessons
        .filter((lesson) => lesson.position <= lessonLimit)
        .map((lesson) => ({
          id: lesson.id,
          position: lesson.position,
          title: lesson.title,
          legacyAnchor: lesson.legacyAnchor,
        })),
    }))
    .filter((courseModule) => courseModule.lessons.length > 0);
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const authenticated = Boolean(user);
  const accessibleLessonCount = authenticated ? FULL_LESSON_COUNT : PREVIEW_LESSON_COUNT;

  return NextResponse.json({
    authenticated,
    access: authenticated ? "full" : "preview",
    accessibleLessonCount,
    totalLessonCount: FULL_LESSON_COUNT,
    modules: getAccessibleModules(accessibleLessonCount),
  }, { headers: { "Cache-Control": "no-store" } });
}
