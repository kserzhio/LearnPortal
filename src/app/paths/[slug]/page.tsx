import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SystemIcon } from "@/components/ui/system-icon";
import { getLearningPathBySlug } from "@/features/learning-paths/content";
import { buildLearningPathProgress, createEmptyLearningPathCourseProgress, loadLearningPathCourseProgress } from "@/features/learning-paths/progress";
import { buildLearningPathStepViews, getCurrentLearningPathStep, getLearningPathCourseHref, getLearningPathCoursePresentation } from "@/features/learning-paths/presentation";
import { createSeoMetadata } from "@/lib/seo/site";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import styles from "./path-detail.module.css";

type LearningPathPageProps = Readonly<{ params: Promise<{ slug: string }> }>;
const statusLabels = { completed: "Завершено", current: "Поточний крок", upcoming: "Далі" } as const;

export async function generateMetadata({ params }: LearningPathPageProps): Promise<Metadata> {
  const { slug } = await params;
  const path = getLearningPathBySlug(slug);
  if (!path || path.status !== "published") return {};
  return createSeoMetadata({ title: path.title, description: path.shortDescription, pathname: `/paths/${path.slug}`, keywords: ["навчальний шлях", "guided learning", path.title] });
}

export default async function LearningPathPage({ params }: LearningPathPageProps) {
  const { slug } = await params;
  const path = getLearningPathBySlug(slug);
  if (!path || path.status !== "published") notFound();
  const supabase = await createSupabaseServerClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const emptyProgress = createEmptyLearningPathCourseProgress([path]);
  const progressResult = user && supabase ? await loadLearningPathCourseProgress(supabase, user.id, [path]) : { available: true, courses: emptyProgress };
  const progress = buildLearningPathProgress(path, progressResult.courses);
  const steps = buildLearningPathStepViews(path, progressResult.courses);
  const hasReliableProgress = !user || progressResult.available;
  const current = getCurrentLearningPathStep(steps);
  const target = hasReliableProgress ? current ?? steps[0] : steps[0];
  const targetHref = getLearningPathCourseHref(target.step.course);
  const actionLabel = !hasReliableProgress ? "Відкрити перший курс" : progress.completed && current?.step.requirement !== "optional" ? "Повторити шлях" : current?.step.requirement === "optional" ? "Спробувати optional course" : target.completedUnits > 0 || progress.started ? "Продовжити шлях" : "Почати шлях";

  return (
    <main className={`page-shell ${styles.page}`}>
      <nav className={styles.breadcrumbs} aria-label="Хлібні крихти"><Link href="/paths">Навчальні шляхи</Link><span aria-hidden="true">/</span><span aria-current="page">{path.title}</span></nav>
      <header className={styles.hero}>
        <div><p className={styles.kicker}>LEARNING PATH · {path.audience.toUpperCase()}</p><h1>{path.title}</h1><p className={styles.intro}>{path.shortDescription}</p><div className={styles.outcome}><strong>Результат шляху</strong><p>{path.outcome}</p></div><Link className={`primary-link ${styles.primaryAction}`} href={targetHref}>{actionLabel} <SystemIcon name="arrow-right" /></Link></div>
        <dl className={styles.summary} aria-label="Огляд шляху"><div><dt>Required progress</dt><dd>{user && progressResult.available ? `${progress.percent}%` : user ? "—" : "0%"}</dd></div><div><dt>Курси</dt><dd>{path.steps.length}</dd></div><div><dt>Оцінка</dt><dd>{path.duration.estimatedHours} год</dd></div><div><dt>Темп</dt><dd>{path.duration.recommendedWeeks} тиж</dd></div></dl>
      </header>
      {!user ? <aside className={styles.notice}><strong>Ти переглядаєш нульовий стан.</strong><p>Увійди, щоб побачити синхронізований прогрес і продовжити з фактичного кроку.</p><Link href={`/auth/sign-in?next=${encodeURIComponent(`/paths/${path.slug}`)}`}>Увійти <SystemIcon name="arrow-right" /></Link></aside> : null}
      {user && !progressResult.available ? <div className={styles.error} role="status">Прогрес тимчасово недоступний. Спробуй оновити сторінку пізніше.</div> : null}
      <section className={styles.roadmap} aria-labelledby="roadmapHeading">
        <header><p>ORDERED ROADMAP</p><h2 id="roadmapHeading">Кроки до результату</h2><p>Optional course можна пройти у зручний момент — він не блокує завершення required шляху.</p></header>
        <ol className={styles.steps}>{steps.map((entry) => { const course = getLearningPathCoursePresentation(entry.step.course); return (
          <li key={entry.step.id} className={styles[hasReliableProgress ? entry.status : "upcoming"]} aria-current={hasReliableProgress && entry.status === "current" ? "step" : undefined}>
            <div className={styles.marker} aria-hidden="true"><SystemIcon name={!hasReliableProgress ? "circle" : entry.status === "completed" ? "check" : entry.status === "current" ? "play" : "circle"} /></div>
            <article><header><span>Крок {entry.step.position}</span><strong>{hasReliableProgress ? statusLabels[entry.status] : "Статус недоступний"}</strong><em>{entry.step.requirement === "optional" ? "Optional" : "Required"}</em></header><h3>{entry.step.title}</h3><p>{entry.step.outcome}</p><div className={styles.course}><span>Курс</span><strong>{course?.title ?? entry.step.course.courseId}</strong>{course ? <p>{course.description}</p> : null}</div><div className={styles.stepProgress}>{hasReliableProgress ? <><span>{entry.completedUnits} із {entry.totalUnits} кроків завершено</span><progress value={entry.completedUnits} max={Math.max(1, entry.totalUnits)} aria-label={`Прогрес курсу ${course?.title ?? entry.step.title}`} /></> : <span>Дані прогресу недоступні</span>}</div><Link href={getLearningPathCourseHref(entry.step.course)}>{hasReliableProgress && entry.status === "current" ? "Продовжити курс" : hasReliableProgress && entry.status === "completed" ? "Переглянути курс" : "Відкрити курс"} <SystemIcon name="arrow-right" /></Link></article>
          </li>); })}</ol>
      </section>
    </main>
  );
}
