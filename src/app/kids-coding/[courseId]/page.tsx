import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getKidsCourse } from "@/features/kids-coding/content/course-registry";
import { createEmptyKidsProgress } from "@/features/kids-coding/progress";
import { loadKidsProgressForUser } from "@/features/kids-coding/progress/server-progress";
import { KidsWorldMapView } from "@/features/kids-coding/ui/world-map";
import { buildKidsWorldMap } from "@/features/kids-coding/world-map";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AccessibleFaq } from "@/features/learning-support/learning-support";
import { kidsCourseFaq } from "@/features/learning-support/content";
import { createSeoMetadata } from "@/lib/seo/site";

type PageProps = Readonly<{ params: Promise<{ courseId: string }> }>;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const course = getKidsCourse((await params).courseId);
  return course
    ? createSeoMetadata({ title: `Карта пригод · ${course.title}`, description: `Світи, рівні та прогрес курсу ${course.title}.`, pathname: `/kids-coding/${course.id}`, index: false })
    : createSeoMetadata({ title: "Курс не знайдено", description: "Запитаний дитячий курс не знайдено.", pathname: `/kids-coding/${(await params).courseId}`, index: false });
}

export default async function KidsWorldMapPage({ params }: PageProps) {
  const { courseId } = await params;
  const course = getKidsCourse(courseId);
  if (!course) notFound();

  const configured = isSupabaseConfigured();
  const supabase = await createSupabaseServerClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (configured && !user) redirect(`/auth/sign-in?next=${encodeURIComponent(`/kids-coding/${course.id}`)}`);

  const progress = user && supabase
    ? await loadKidsProgressForUser(supabase, user.id, course.id)
    : createEmptyKidsProgress(course.id);

  return (
    <div>
      <KidsWorldMapView
        courseTitle={course.title}
        courseDescription={course.shortDescription}
        courseAccent={course.accent}
        map={buildKidsWorldMap(course, progress)}
      />
      <div className="page-shell"><AccessibleFaq title="FAQ курсу" items={kidsCourseFaq} /></div>
    </div>
  );
}
