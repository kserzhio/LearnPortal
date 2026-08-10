import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { courses } from "@/content/courses";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Мій прогрес" };

export default async function DashboardPage() {
  const configured = isSupabaseConfigured();
  const supabase = await createSupabaseServerClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;

  if (configured && !user) redirect("/auth/sign-in");

  const [profileResult, progressResult, enrollmentsResult, architectureResult, attemptsResult] = user && supabase
    ? await Promise.all([
      supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
      supabase.from("lesson_progress").select("course_id, lesson_id, completed, position, updated_at").eq("user_id", user.id),
      supabase.from("course_enrollments").select("course_id, enrolled_at").eq("user_id", user.id),
      supabase.from("saved_architectures").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("simulator_attempts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    ])
    : [{ data: null }, { data: [] }, { data: [] }, { count: 0 }, { count: 0 }];
  const displayName = profileResult.data?.display_name ?? user?.user_metadata?.full_name ?? user?.email;
  const progress = progressResult.data ?? [];
  const completed = progress.filter((item) => item.completed).length;
  const savedArchitectures = architectureResult.count ?? 0;
  const simulatorAttempts = attemptsResult.count ?? 0;
  const enrolledCourseIds = new Set((enrollmentsResult.data ?? []).map((item) => item.course_id));
  const enrolledCourses = courses.filter((course) => course.status === "published" && enrolledCourseIds.has(course.id));
  const completedByCourse = progress.reduce((totals, item) => {
    if (item.completed) totals.set(item.course_id, (totals.get(item.course_id) ?? 0) + 1);
    return totals;
  }, new Map<string, number>());

  return (
    <main className="page-shell dashboard-page">
      <header className="dashboard-heading">
        <div><span>LEARNING CONTROL ROOM</span><h1>{user ? `Вітаємо, ${displayName}` : "Dashboard preview"}</h1><p>{user ? "Твій прогрес синхронізується через Supabase." : "Supabase ще не підключено — показуємо безпечний локальний preview."}</p></div>
        <Link className="primary-link" href="/courses">Продовжити навчання <span>→</span></Link>
      </header>
      <section className="dashboard-metrics" aria-label="Показники навчання">
        <article><span>ЗАВЕРШЕНО</span><b>{completed}</b><small>занять</small></article>
        <article><span>СПРОБИ СИМУЛЯТОРА</span><b>{simulatorAttempts}</b><small>attempts</small></article>
        <article><span>ЗБЕРЕЖЕНІ СХЕМИ</span><b>{savedArchitectures}</b><small>architectures</small></article>
        <article><span>AUTH STATUS</span><b>{user ? "SYNC" : "LOCAL"}</b><small>{configured ? "Supabase ready" : "configuration required"}</small></article>
      </section>
      <section className="dashboard-course-list">
        <div className="section-heading-row"><div><span>МОЇ КУРСИ</span><h2>Продовжити з останнього місця</h2></div></div>
        {enrolledCourses.map((course) => {
          const courseCompleted = completedByCourse.get(course.id) ?? 0;
          const progressPercent = course.lessonCount > 0 ? Math.round(courseCompleted / course.lessonCount * 100) : 0;
          return (
          <article key={course.id}>
            <span className="course-badge">{course.accent}</span>
            <div><h3>{course.title}</h3><p>{courseCompleted} із {course.lessonCount} занять завершено</p><div className="dashboard-progress" aria-label={`${courseCompleted} із ${course.lessonCount} занять`}><i style={{ width: `${progressPercent}%` }} /></div></div>
            <Link href={`/courses/${course.slug}`}>Відкрити →</Link>
          </article>
          );
        })}
        {enrolledCourses.length === 0 ? (
          <div className="dashboard-empty">
            <h3>У кабінеті ще немає курсів</h3>
            <p>Обери опублікований курс у каталозі — його прогрес зберігатиметься окремо.</p>
            <Link className="primary-link" href="/courses">Переглянути курси <span>→</span></Link>
          </div>
        ) : null}
      </section>
    </main>
  );
}
