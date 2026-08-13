import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { courses, getCourseLessons } from "@/content/courses";
import { kidsCourses } from "@/features/kids-coding/content/course-registry";
import { KidsCourseDashboard, type KidsCourseProgressSummary } from "@/features/kids-coding/ui/course-dashboard";
import { buildContinueLearningState } from "@/lib/progress/continue-learning";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SystemIcon } from "@/components/ui/system-icon";

export const metadata: Metadata = { title: "Мій прогрес" };
const activityDateFormatter = new Intl.DateTimeFormat("uk-UA", { dateStyle: "medium" });
const kidsCourseIds = kidsCourses.map((course) => course.id);

export default async function DashboardPage() {
  const configured = isSupabaseConfigured();
  const supabase = await createSupabaseServerClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;

  if (configured && !user) redirect("/auth/sign-in");

  const [profileResult, progressResult, enrollmentsResult, architectureResult, attemptsResult, kidsProgressResult] = user && supabase
    ? await Promise.all([
      supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
      supabase.from("lesson_progress").select("course_id, lesson_id, completed, position, updated_at").eq("user_id", user.id),
      supabase.from("course_enrollments").select("course_id, enrolled_at").eq("user_id", user.id),
      supabase.from("saved_architectures").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("simulator_attempts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("kids_level_progress").select("course_id, level_id, completed, stars").eq("user_id", user.id).in("course_id", kidsCourseIds),
    ])
    : [{ data: null }, { data: [] }, { data: [] }, { count: 0 }, { count: 0 }, { data: [] }];
  const displayName = profileResult.data?.display_name ?? user?.user_metadata?.full_name ?? user?.email;
  const progress = progressResult.data ?? [];
  const completed = progress.filter((item) => item.completed).length;
  const savedArchitectures = architectureResult.count ?? 0;
  const simulatorAttempts = attemptsResult.count ?? 0;
  const kidsProgressRows = kidsProgressResult.data ?? [];
  const kidsProgress: KidsCourseProgressSummary[] = kidsCourses.map((course) => {
    const rows = kidsProgressRows.filter((row) => row.course_id === course.id);
    return {
      courseId: course.id,
      completedLevelIds: rows.filter((row) => row.completed).map((row) => row.level_id),
      startedLevelIds: rows.map((row) => row.level_id),
      stars: rows.reduce((total, row) => total + Number(row.stars), 0),
    };
  });
  const enrolledCourseIds = new Set((enrollmentsResult.data ?? []).map((item) => item.course_id));
  const activeCourseIds = new Set([...enrolledCourseIds, ...progress.map((item) => item.course_id)]);
  const enrolledCourses = courses.filter((course) => course.status === "published" && activeCourseIds.has(course.id));
  const learningByCourse = new Map(enrolledCourses.map((course) => {
    const learning = buildContinueLearningState(
      course,
      getCourseLessons(course.id),
      progress.filter((item) => item.course_id === course.id).map((item) => ({
        lessonId: item.lesson_id,
        completed: item.completed,
        updatedAt: item.updated_at,
      })),
    );
    return [course.id, learning] as const;
  }));
  const latestCourse = enrolledCourses.toSorted((first, second) => {
    const firstDate = Date.parse(learningByCourse.get(first.id)?.lastActivityAt ?? "") || 0;
    const secondDate = Date.parse(learningByCourse.get(second.id)?.lastActivityAt ?? "") || 0;
    return secondDate - firstDate;
  })[0];
  const latestLearning = latestCourse ? learningByCourse.get(latestCourse.id) : null;

  return (
    <main className="page-shell dashboard-page">
      <header className="dashboard-heading">
        <div><span>LEARNING CONTROL ROOM</span><h1>{user ? `Вітаємо, ${displayName}` : "Dashboard preview"}</h1><p>{user ? "Твій прогрес синхронізується через Supabase." : "Supabase ще не підключено — показуємо безпечний локальний preview."}</p></div>
        {latestLearning ? (
          <div className="dashboard-primary-action">
            <span>{latestLearning.courseTitle}</span>
            <strong>{latestLearning.nextLesson ? `Заняття ${latestLearning.nextLesson.position}. ${latestLearning.nextLesson.title}` : "Курс завершено"}</strong>
            <small>{latestLearning.completedLessons} із {latestLearning.totalLessons} занять</small>
            <Link className="primary-link" href={latestLearning.href}>{latestLearning.actionLabel} <SystemIcon name="arrow-right" /></Link>
          </div>
        ) : <Link className="primary-link" href="/courses">Обрати курс <SystemIcon name="arrow-right" /></Link>}
      </header>
      <section className="dashboard-metrics" aria-label="Показники навчання">
        <article><span>ЗАВЕРШЕНО</span><b>{completed}</b><small>занять</small></article>
        <article><span>СПРОБИ СИМУЛЯТОРА</span><b>{simulatorAttempts}</b><small>attempts</small><Link className="metric-detail-link" href="/dashboard/attempts">Відкрити історію <SystemIcon name="arrow-right" /></Link></article>
        <article><span>ЗБЕРЕЖЕНІ СХЕМИ</span><b>{savedArchitectures}</b><small>architectures</small><Link className="metric-detail-link" href="/dashboard/projects">Завершені проєкти <SystemIcon name="arrow-right" /></Link></article>
        <article><span>AUTH STATUS</span><b>{user ? "SYNC" : "LOCAL"}</b><small>{configured ? "Supabase ready" : "configuration required"}</small></article>
      </section>
      <KidsCourseDashboard variant="dashboard" progress={kidsProgress} />
      <section className="dashboard-course-list">
        <div className="section-heading-row"><div><span>МОЇ КУРСИ</span><h2>Продовжити з останнього місця</h2></div></div>
        {enrolledCourses.map((course) => {
          const learning = learningByCourse.get(course.id);
          if (!learning) return null;
          const progressPercent = learning.totalLessons > 0 ? Math.round(learning.completedLessons / learning.totalLessons * 100) : 0;
          return (
          <article key={course.id}>
            <span className="course-badge">{course.accent}</span>
            <div>
              <h3>{course.title}</h3>
              <p>{learning.completedLessons} із {learning.totalLessons} занять завершено</p>
              <p className="dashboard-resume-copy">{learning.nextLesson ? `${learning.nextLesson.position}. ${learning.nextLesson.title}` : "Підсумок курсу доступний"}</p>
              {learning.lastActivityAt ? <time className="dashboard-last-activity" dateTime={learning.lastActivityAt}>Остання активність: {activityDateFormatter.format(new Date(learning.lastActivityAt))}</time> : null}
              <div className="dashboard-progress" role="progressbar" aria-label={`${learning.completedLessons} із ${learning.totalLessons} занять`} aria-valuemin={0} aria-valuemax={learning.totalLessons} aria-valuenow={learning.completedLessons}><i style={{ width: `${progressPercent}%` }} /></div>
            </div>
            <Link href={`/courses/${course.slug}`}>Сторінка курсу <SystemIcon name="arrow-right" /></Link>
          </article>
          );
        })}
        {enrolledCourses.length === 0 ? (
          <div className="dashboard-empty">
            <h3>У кабінеті ще немає курсів</h3>
            <p>Обери опублікований курс у каталозі — його прогрес зберігатиметься окремо.</p>
            <Link className="primary-link" href="/courses">Переглянути курси <SystemIcon name="arrow-right" /></Link>
          </div>
        ) : null}
      </section>
    </main>
  );
}
