import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { courses } from "@/content/courses";
import { formatDateInput, formatPercent, parseGrowthDashboardSnapshot, resolveGrowthDateRange } from "@/features/growth-dashboard/growth-dashboard";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type GrowthDashboardPageProps = Readonly<{ searchParams:Promise<{ start?:string; end?:string }> }>;

export const metadata:Metadata = {
  title:"Growth Dashboard",
  description:"Внутрішній агрегований dashboard навчального порталу SYSTEMA.",
  robots:{ index:false, follow:false, nocache:true },
};

const unavailableMetrics = [
  ["Visitors і page views", "Vercel Web Analytics доступний у platform dashboard, але не експортується в PostgreSQL."],
  ["Homepage → Course → Start", "Надійний funnel потребує custom events, які зараз поставлено на паузу."],
  ["Returning learners", "Поточні progress-таблиці зберігають останній стан, а не повну історію сесій."],
  ["Hints і shares", "Ці взаємодії не мають persisted aggregate source, доки custom events на паузі."],
] as const;

export default async function GrowthDashboardPage({ searchParams }:GrowthDashboardPageProps) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) notFound();
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) redirect(`/auth/sign-in?next=${encodeURIComponent("/dashboard/growth")}`);
  const profile = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile.data || !["ADMIN","INSTRUCTOR"].includes(profile.data.role)) notFound();

  const query = await searchParams;
  const range = resolveGrowthDateRange(query.start, query.end);
  const result = await supabase.rpc("growth_dashboard_snapshot", { p_start:range.start.toISOString(), p_end:range.end.toISOString() });
  const snapshot = result.error ? null : parseGrowthDashboardSnapshot(result.data);
  const inclusiveEnd = new Date(range.end.getTime() - 86_400_000);
  const plannedTitles = new Map(courses.filter((course) => course.status === "planned").map((course) => [course.slug, course.title]));

  return (
    <main className="page-shell growth-dashboard">
      <header className="growth-heading">
        <div><p>INTERNAL · AGGREGATED DATA</p><h1>Growth Dashboard</h1><span>Навчальні сигнали без персональних даних і без вигаданих conversion metrics.</span></div>
        <form method="get" className="growth-range" aria-label="Період звіту">
          <label>Від<input type="date" name="start" defaultValue={formatDateInput(range.start)} required /></label>
          <label>До<input type="date" name="end" defaultValue={formatDateInput(inclusiveEnd)} required /></label>
          <button type="submit">Оновити звіт</button>
        </form>
      </header>

      {!snapshot ? <section className="growth-error" role="alert"><h2>Дані тимчасово недоступні</h2><p>Перевір міграцію Growth Dashboard або з’єднання з Supabase. Dashboard не підміняє помилку нульовими значеннями.</p></section> : (
        <>
          <section aria-labelledby="learningHeading">
            <div className="growth-section-heading"><span>01</span><div><p>LEARNING</p><h2 id="learningHeading">Що відбувалося в навчанні</h2></div></div>
            <dl className="growth-stat-grid">
              <div><dt>Активні учні</dt><dd>{snapshot.learning.activeLearners}</dd><small>Унікальні акаунти з progress, Kids attempt або Knowledge Check.</small></div>
              <div><dt>Завершені заняття</dt><dd>{snapshot.learning.lessonCompletions}</dd><small>Adult lesson completions у вибраному періоді.</small></div>
              <div><dt>Завершені курси</dt><dd>{snapshot.learning.courseCompletions}</dd><small>Користувачі, що завершили всі заняття курсу.</small></div>
              <div><dt>Kids attempts</dt><dd>{snapshot.learning.kidsAttempts}</dd><small>Усі збережені запуски вправ, успішні й неуспішні.</small></div>
              <div><dt>Kids completions</dt><dd>{snapshot.learning.kidsCompletions}</dd><small>Валідні завершення Kids Coding levels.</small></div>
              <div><dt>Adult activity records</dt><dd>{snapshot.learning.adultLessonRecords}</dd><small>Progress rows, оновлені у вибраному періоді; це не page views.</small></div>
            </dl>
          </section>

          <section aria-labelledby="qualityHeading">
            <div className="growth-section-heading"><span>02</span><div><p>QUALITY</p><h2 id="qualityHeading">Чи допомагає навчальний контент</h2></div></div>
            <dl className="growth-stat-grid quality">
              <div><dt>Helpful feedback</dt><dd>{formatPercent(snapshot.quality.feedbackHelpful,snapshot.quality.feedbackTotal)}</dd><small>{snapshot.quality.feedbackHelpful} helpful із {snapshot.quality.feedbackTotal} відповідей.</small></div>
              <div><dt>Knowledge Check success</dt><dd>{formatPercent(snapshot.quality.knowledgeCorrect,snapshot.quality.knowledgeAttempts)}</dd><small>{snapshot.quality.knowledgeCorrect} правильних із {snapshot.quality.knowledgeAttempts} attempts.</small></div>
              <div><dt>Питання</dt><dd>{snapshot.quality.questions}</dd><small>Нові питання, ідеї та lesson problems.</small></div>
              <div><dt>Вирішені питання</dt><dd>{snapshot.quality.questionsResolved}</dd><small>{formatPercent(snapshot.quality.questionsResolved,snapshot.quality.questions)} створених у періоді позначено resolved.</small></div>
            </dl>
          </section>

          <section aria-labelledby="coursesHeading">
            <div className="growth-section-heading"><span>03</span><div><p>COURSES</p><h2 id="coursesHeading">Результати за курсами</h2></div></div>
            {snapshot.courses.length ? <div className="growth-table-scroll" role="region" aria-label="Таблиця результатів курсів" tabIndex={0}><table><thead><tr><th scope="col">Курс</th><th scope="col">Enrollments, всього</th><th scope="col">Активні учні</th><th scope="col">Заняття завершено</th><th scope="col">Курси завершено</th></tr></thead><tbody>{snapshot.courses.map((course) => <tr key={course.id}><th scope="row">{course.title}</th><td>{course.enrollments}</td><td>{course.active_learners}</td><td>{course.lesson_completions}</td><td>{course.course_completions}</td></tr>)}</tbody></table></div> : <p className="growth-empty">У вибраному періоді немає доступних course aggregates.</p>}
          </section>

          <section aria-labelledby="demandHeading">
            <div className="growth-section-heading"><span>04</span><div><p>DEMAND · CURRENT SNAPSHOT</p><h2 id="demandHeading">Які курси очікують</h2></div></div>
            <ol className="growth-demand">{snapshot.roadmapVotes.map((vote,index) => <li key={vote.course_slug}><span>{String(index+1).padStart(2,"0")}</span><strong>{plannedTitles.get(vote.course_slug) ?? vote.course_slug}</strong><b>{vote.vote_count} голосів</b></li>)}</ol>
          </section>
        </>
      )}

      <section aria-labelledby="unavailableHeading" className="growth-unavailable">
        <div className="growth-section-heading"><span>05</span><div><p>MEASUREMENT GAPS</p><h2 id="unavailableHeading">Що поки не можна стверджувати</h2></div></div>
        <ul>{unavailableMetrics.map(([title,description]) => <li key={title}><strong>{title}</strong><p>{description}</p></li>)}</ul>
      </section>
      <footer className="growth-formulas"><strong>Період:</strong> від {formatDateInput(range.start)} включно до {formatDateInput(inclusiveEnd)} включно. Формули та обмеження задокументовані в репозиторії.</footer>
    </main>
  );
}
