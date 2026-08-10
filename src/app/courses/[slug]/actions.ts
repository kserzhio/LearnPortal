"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCourseBySlug } from "@/content/courses";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function enrollInCourse(courseId: string, slug: string) {
  const course = getCourseBySlug(slug);
  if (!course || course.id !== courseId || course.status !== "published") {
    redirect("/courses");
  }

  const supabase = await createSupabaseServerClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!user || !supabase) {
    redirect(`/auth/sign-in?next=${encodeURIComponent(`/courses/${slug}`)}`);
  }

  const { error } = await supabase.from("course_enrollments").upsert({
    user_id: user.id,
    course_id: course.id,
  }, { onConflict: "user_id,course_id", ignoreDuplicates: true });

  if (error) {
    redirect(`/courses/${slug}?enrollment=failed`);
  }

  revalidatePath(`/courses/${slug}`);
  revalidatePath("/dashboard");
  redirect(`/courses/${slug}?enrollment=success`);
}
