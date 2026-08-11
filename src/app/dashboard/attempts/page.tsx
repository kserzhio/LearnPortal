import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { courses, getCourseLessonPath, getCourseLessons } from "@/content/courses";
import { getAttemptFeedback, getSimulatorTitle } from "@/lib/simulators/attempt-feedback";
import { FINAL_DESIGN_COURSE_ID, FINAL_DESIGN_LESSON_ID } from "@/lib/simulators/final-system-design";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Історія спроб симулятора" };
const attemptDateFormatter = new Intl.DateTimeFormat("uk-UA", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Kyiv",
});
const MAX_HISTORY_ITEMS = 50;
const finalDesignCourse = courses.find((course) => course.id === FINAL_DESIGN_COURSE_ID);
const finalDesignLesson = getCourseLessons(FINAL_DESIGN_COURSE_ID).find((lesson) => lesson.id === FINAL_DESIGN_LESSON_ID);
const finalDesignHref = finalDesignCourse && finalDesignLesson
  ? getCourseLessonPath(finalDesignCourse, finalDesignLesson.position)
  : "/courses";

export default async function SimulatorAttemptsPage() {
  const configured = isSupabaseConfigured();
  const supabase = await createSupabaseServerClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;

  if (configured && !user) redirect("/auth/sign-in?next=%2Fdashboard%2Fattempts");

  const attemptsResult = user && supabase
    ? await supabase
      .from("simulator_attempts")
      .select("id, course_id, lesson_id, simulator_id, validation_code, score, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(MAX_HISTORY_ITEMS)
    : { data: [], error: null };

  const attempts = attemptsResult.data ?? [];
  const lessonsById = new Map(courses.flatMap((course) => getCourseLessons(course.id)).map((lesson) => [lesson.id, lesson]));
  const coursesById = new Map(courses.map((course) => [course.id, course]));
  const hasLoadError = Boolean(attemptsResult.error);

  return (
    <main className="page-shell attempt-history-page">
      <header className="attempt-history-heading">
        <div>
          <span>SIMULATOR REVIEW</span>
          <h1>Історія архітектурних рішень</h1>
          <p>Кожна спроба показує не лише score, а й причину результату та наступний крок для виправлення системи.</p>
        </div>
        <Link className="secondary-link" href="/dashboard">← До кабінету</Link>
      </header>

      {hasLoadError ? <p className="attempt-history-error" role="alert">Не вдалося завантажити історію. Онови сторінку або спробуй пізніше.</p> : null}

      {!hasLoadError && attempts.length === 0 ? (
        <section className="attempt-history-empty">
          <span>0 СПРОБ</span>
          <h2>Історія з’явиться після першої перевірки</h2>
          <p>Відкрий фінальне заняття, побудуй архітектуру та запусти validation.</p>
          <Link className="primary-link" href={finalDesignHref}>Відкрити фінальний симулятор <span>→</span></Link>
        </section>
      ) : null}

      {attempts.length > 0 ? (
        <ol className="attempt-history-list" aria-label="Останні спроби симулятора">
          {attempts.map((attempt) => {
            const feedback = getAttemptFeedback(attempt.validation_code);
            const lesson = lessonsById.get(attempt.lesson_id);
            const course = coursesById.get(attempt.course_id);
            const lessonHref = course && lesson
              ? getCourseLessonPath(course, lesson.position)
              : "/courses";
            const score = Math.min(100, Math.max(0, Math.round(Number(attempt.score) || 0)));

            return (
              <li key={attempt.id} className={feedback.valid ? "attempt-card valid" : "attempt-card invalid"}>
                <article>
                  <header>
                    <div>
                      <span>{getSimulatorTitle(attempt.simulator_id)}</span>
                      <h2>{feedback.title}</h2>
                    </div>
                    <span className="attempt-status">{feedback.label}</span>
                  </header>
                  <div className="attempt-score-row">
                    <div><strong>{score}</strong><span>зі 100</span></div>
                    <meter min="0" max="100" value={score}>{score} зі 100</meter>
                  </div>
                  <dl>
                    <div><dt>Заняття</dt><dd>{lesson ? `${lesson.position}. ${lesson.title}` : attempt.lesson_id}</dd></div>
                    <div><dt>Дата</dt><dd><time dateTime={attempt.created_at}>{attemptDateFormatter.format(new Date(attempt.created_at))}</time></dd></div>
                    <div><dt>Validation code</dt><dd><code>{attempt.validation_code ?? "not-available"}</code></dd></div>
                  </dl>
                  <div className="attempt-feedback">
                    <p>{feedback.explanation}</p>
                    <p><strong>Наступний крок:</strong> {feedback.nextStep}</p>
                  </div>
                  <Link href={lessonHref}>Відкрити заняття та перевірити ще раз →</Link>
                </article>
              </li>
            );
          })}
        </ol>
      ) : null}
    </main>
  );
}
