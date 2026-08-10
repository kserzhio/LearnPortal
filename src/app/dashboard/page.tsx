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

  const profileResult = user && supabase
    ? await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle()
    : { data: null };
  const displayName = profileResult.data?.display_name ?? user?.user_metadata?.full_name ?? user?.email;

  const progressResult = user && supabase
    ? await supabase.from("lesson_progress").select("course_id, lesson_id, completed, position, updated_at").eq("user_id", user.id)
    : { data: [], error: null };
  const progress = progressResult.data ?? [];
  const completed = progress.filter((item) => item.completed).length;
  const architectureResult = user && supabase
    ? await supabase.from("saved_architectures").select("id", { count: "exact", head: true }).eq("user_id", user.id)
    : { count: 0 };
  const savedArchitectures = architectureResult.count ?? 0;
  const attemptsResult = user && supabase
    ? await supabase.from("simulator_attempts").select("id", { count: "exact", head: true }).eq("user_id", user.id)
    : { count: 0 };
  const simulatorAttempts = attemptsResult.count ?? 0;

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
        {courses.filter((course) => course.status === "published").map((course) => (
          <article key={course.id}>
            <span className="course-badge">{course.accent}</span>
            <div><h3>{course.title}</h3><p>{completed} із {course.lessonCount} занять завершено</p><div className="dashboard-progress" aria-label={`${completed} із ${course.lessonCount} занять`}><i style={{ width: `${Math.round(completed / course.lessonCount * 100)}%` }} /></div></div>
            <Link href={`/courses/${course.slug}`}>Відкрити →</Link>
          </article>
        ))}
      </section>
    </main>
  );
}
