import type { Metadata } from "next";
import Link from "next/link";
import { courses } from "@/content/courses";
import { KidsCourseDashboard } from "@/features/kids-coding/ui/course-dashboard";
import { SystemIcon } from "@/components/ui/system-icon";
import { createSeoMetadata } from "@/lib/seo/site";
import { buildRoadmapCourses } from "@/features/roadmap/roadmap";
import { CourseRoadmap } from "@/features/roadmap/course-roadmap";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = createSeoMetadata({
  title: "Каталог інтерактивних курсів",
  description: "Практичні курси SYSTEMA з архітектури систем, алгоритмів і JavaScript із симуляціями та миттєвою перевіркою.",
  pathname: "/courses",
  keywords: ["курси програмування", "system design course", "інтерактивне навчання", "алгоритми", "JavaScript для дітей"],
});

type VoteTotalRow = { course_slug: string; vote_count: number | string };

export default async function CoursesPage() {
  const supabase = await createSupabaseServerClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const [totalsResult, voteResult] = supabase
    ? await Promise.all([
      supabase.rpc("course_roadmap_vote_totals"),
      user ? supabase.from("course_roadmap_votes").select("course_slug").eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    ])
    : [{ data: [], error: new Error("Supabase unavailable") }, { data: null, error: null }];
  const totals = ((totalsResult.data ?? []) as VoteTotalRow[]).map((row) => ({ courseSlug: row.course_slug, voteCount: Number(row.vote_count) }));
  const roadmapCourses = buildRoadmapCourses(courses, totals, voteResult.data?.course_slug ?? null);
  const votingAvailable = !totalsResult.error && !voteResult.error;

  return (
    <main className="page-shell">
      <header className="page-intro">
        <span>КАТАЛОГ SYSTEMA</span>
        <h1>Обери наступну<br /><em>архітектурну компетенцію.</em></h1>
        <p>Кожен курс поєднує коротку теорію, практичний design і перевірку failure scenarios.</p>
      </header>
      <section className="course-grid" aria-label="Доступні курси">
        {courses.map((course) => (
          <article key={course.id} className={course.status === "planned" ? "planned" : ""}>
            <div className="course-card-top"><span className="course-badge">{course.accent}</span><small>{course.status === "published" ? "ДОСТУПНИЙ" : "ЗАПЛАНОВАНО"}</small></div>
            <h2>{course.title}</h2>
            <p>{course.description}</p>
            <dl><div><dt>Рівень</dt><dd>{course.level}</dd></div><div><dt>Тривалість</dt><dd>{course.duration}</dd></div><div><dt>Заняття</dt><dd>{course.lessonCount || "—"}</dd></div></dl>
            <Link href={`/courses/${course.slug}`}>Переглянути програму <SystemIcon name="arrow-right" /></Link>
          </article>
        ))}
      </section>
      <CourseRoadmap courses={roadmapCourses} authenticated={Boolean(user)} available={votingAvailable} />
      <KidsCourseDashboard variant="catalog" />
    </main>
  );
}
