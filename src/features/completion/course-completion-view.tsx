import Link from "next/link";
import { ProductEventBeacon } from "@/components/analytics/product-event-beacon";
import { SystemIcon } from "@/components/ui/system-icon";
import { getCourseLessonPath, type CourseSummary } from "@/content/courses";
import { formatCompletionDate, type CourseCompletionSnapshot } from "@/features/completion/completion";
import type { CourseCompletionGuidance } from "@/features/learning-paths/recommendation";
import { getLearningPathCoursePresentation } from "@/features/learning-paths/presentation";
import { SharePanel } from "@/features/sharing/share-panel";
import { absoluteUrl } from "@/lib/seo/site";

type CourseCompletionViewProps = Readonly<{
  snapshot: CourseCompletionSnapshot;
  course: CourseSummary;
  learnerName?: string;
  authenticated: boolean;
  pathGuidance?: CourseCompletionGuidance;
}>;

export function CourseCompletionView({ snapshot, course, learnerName = "Учасник SYSTEMA", authenticated, pathGuidance }: CourseCompletionViewProps) {
  const remainingLessons = snapshot.totalLessons - snapshot.completedLessons;
  const nextLessonPosition = Math.min(snapshot.completedLessons + 1, snapshot.totalLessons);
  const percent = snapshot.totalLessons ? Math.round(snapshot.completedLessons / snapshot.totalLessons * 100) : 0;
  const publicCourseUrl = absoluteUrl(`/courses/${snapshot.courseSlug}`);

  if (!snapshot.isComplete) {
    return (
      <main className="page-shell completion-page">
        <section className="completion-status" aria-labelledby="completionPendingHeading">
          <p className="completion-kicker">COURSE COMPLETION</p>
          <h1 id="completionPendingHeading">До підсумку залишилося {remainingLessons} {remainingLessons === 1 ? "заняття" : "занять"}</h1>
          <p>Сертифікат з’явиться після завершення всіх занять курсу. Поточний результат: {snapshot.completedLessons} із {snapshot.totalLessons}.</p>
          <div className="completion-progress" role="progressbar" aria-label="Прогрес курсу" aria-valuemin={0} aria-valuemax={snapshot.totalLessons} aria-valuenow={snapshot.completedLessons}>
            <span style={{ width: `${percent}%` }} />
          </div>
          <Link className="primary-link" href={getCourseLessonPath(course, nextLessonPosition)}>Продовжити навчання <SystemIcon name="arrow-right" /></Link>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell completion-page">
      <ProductEventBeacon name="course_completed" properties={{ course_id: snapshot.courseId, lesson_count: snapshot.totalLessons }} />
      <header className="completion-heading">
        <div>
          <p className="completion-kicker">КУРС ЗАВЕРШЕНО · {snapshot.completedLessons}/{snapshot.totalLessons}</p>
          <h1>Ти пройшов повний шлях від вимог до відмовостійкої архітектури</h1>
          <p>Нижче — підтвердження завершення та результати, сформовані з реального прогресу.</p>
        </div>
        <span className="completion-mark" aria-hidden="true">✓</span>
      </header>

      <article className="completion-certificate" aria-labelledby="certificateHeading">
        <div className="certificate-brand" aria-hidden="true"><span>▥</span> SYSTEMA</div>
        <p>НАВЧАЛЬНИЙ ПОРТАЛ</p>
        <h2 id="certificateHeading">Certificate of Completion</h2>
        <p>Підтверджує завершення курсу користувачем</p>
        <strong>{learnerName}</strong>
        <h3>{snapshot.courseTitle}</h3>
        <dl>
          <div><dt>Завершено</dt><dd>{snapshot.completedLessons} із {snapshot.totalLessons} занять</dd></div>
          <div><dt>Дата завершення</dt><dd>{formatCompletionDate(snapshot.completedAt)}</dd></div>
          <div><dt>Статус</dt><dd>Course completed</dd></div>
        </dl>
        <p className="certificate-disclaimer">Це внутрішнє підтвердження завершення навчального курсу SYSTEMA. Воно не є професійною акредитацією.</p>
      </article>

      <SharePanel
        heading="Поділися завершеним курсом"
        description="У повідомленні немає імені, дати або приватних даних сертифіката. Посилання веде на публічну сторінку курсу."
        payload={{
          title: `${snapshot.courseTitle} · SYSTEMA`,
          text: `Я завершив курс «${snapshot.courseTitle}» у SYSTEMA.`,
          url: publicCourseUrl,
        }}
      />

      <div className="completion-grid">
        <section aria-labelledby="outcomesHeading">
          <p className="completion-kicker">НАБУТІ РЕЗУЛЬТАТИ</p>
          <h2 id="outcomesHeading">Що підтверджує завершений курс</h2>
          <ul>{snapshot.outcomes.map((outcome) => <li key={outcome}>{outcome}</li>)}</ul>
        </section>
        <aside aria-labelledby="knowledgeHeading">
          <p className="completion-kicker">KNOWLEDGE CHECKS</p>
          <h2 id="knowledgeHeading">Перевірка знань</h2>
          {snapshot.knowledgeChecks ? (
            <dl>
              <div><dt>Виконано</dt><dd>{snapshot.knowledgeChecks.attempted}/{snapshot.knowledgeChecks.available}</dd></div>
              <div><dt>Правильно</dt><dd>{snapshot.knowledgeChecks.passed}/{snapshot.knowledgeChecks.available}</dd></div>
            </dl>
          ) : <p>Статистика гостьових Knowledge Checks не зберігається в сертифікаті.</p>}
          {authenticated ? <Link className="secondary-link" href="/profile">Змінити ім’я у профілі</Link> : (
            <Link className="primary-link" href={`/auth/sign-in?next=${encodeURIComponent(`/courses/${snapshot.courseSlug}/completion`)}`}>Увійти для персоналізованого сертифіката</Link>
          )}
        </aside>
      </div>
      {pathGuidance && (pathGuidance.recommendations.length > 0 || pathGuidance.completedPaths.length > 0) ? (
        <section className="completion-paths" aria-labelledby="completionPathsHeading">
          <p className="completion-kicker">GUIDED LEARNING</p>
          <h2 id="completionPathsHeading">Що далі у твоєму навчальному шляху</h2>
          {pathGuidance.recommendations.length > 0 ? (
            <ul className="completion-recommendations">
              {pathGuidance.recommendations.map((recommendation) => {
                const nextCourse = getLearningPathCoursePresentation(recommendation.nextCourse);
                return (
                  <li key={recommendation.pathId}>
                    <article>
                      <span>Шлях · {recommendation.pathTitle}</span>
                      <h3>{nextCourse?.title ?? recommendation.nextStepTitle}</h3>
                      <p>{recommendation.reason}</p>
                      <Link className="primary-link" href={`/paths/${recommendation.pathSlug}`}>Продовжити шлях <SystemIcon name="arrow-right" /></Link>
                    </article>
                  </li>
                );
              })}
            </ul>
          ) : null}
          {pathGuidance.completedPaths.length > 0 ? (
            <div className="completion-path-membership">
              <h3>Завершені навчальні шляхи</h3>
              <ul>{pathGuidance.completedPaths.map((path) => <li key={path.pathId}><SystemIcon name="check" /> Цей курс завершує шлях <Link href={`/paths/${path.pathSlug}`}>«{path.pathTitle}»</Link>.</li>)}</ul>
            </div>
          ) : null}
        </section>
      ) : null}
      <nav className="completion-actions" aria-label="Дії після завершення курсу">
        <Link className="secondary-link" href={`/courses/${snapshot.courseSlug}`}>До сторінки курсу</Link>
        <Link className="primary-link" href="/courses">Обрати наступний курс <SystemIcon name="arrow-right" /></Link>
      </nav>
    </main>
  );
}
