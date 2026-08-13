import type { Metadata } from "next";
import Link from "next/link";
import { SystemIcon } from "@/components/ui/system-icon";
import { getPublishedLearningPaths } from "@/features/learning-paths/content";
import { buildLearningPathProgress, createEmptyLearningPathCourseProgress, loadLearningPathCourseProgress } from "@/features/learning-paths/progress";
import { filterPublishedLearningPaths, getAvailableLearningPathFilters, resolveLearningPathFilter } from "@/features/learning-paths/presentation";
import { createSeoMetadata } from "@/lib/seo/site";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import styles from "./paths.module.css";

type PathsPageProps = Readonly<{
  searchParams: Promise<{ audience?: string | string[] }>;
}>;

export const metadata: Metadata = createSeoMetadata({
  title: "Навчальні шляхи",
  description: "Керовані навчальні шляхи SYSTEMA для системної архітектури, алгоритмів і JavaScript із реальним прогресом.",
  pathname: "/paths",
  keywords: ["навчальний шлях", "system design roadmap", "курси програмування", "JavaScript для дітей"],
});

const audienceLabels = { adult: "Для дорослих", kids: "Для дітей", mixed: "Спільний шлях" } as const;

export default async function PathsPage({ searchParams }: PathsPageProps) {
  const [query, supabase] = await Promise.all([searchParams, createSupabaseServerClient()]);
  const requestedFilter = resolveLearningPathFilter(query.audience);
  const publishedPaths = getPublishedLearningPaths();
  const availableFilters = getAvailableLearningPathFilters(publishedPaths);
  const activeFilter = requestedFilter === "all" || availableFilters.includes(requestedFilter) ? requestedFilter : "all";
  const visiblePaths = filterPublishedLearningPaths(activeFilter);

  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const progressResult = user && supabase
    ? await loadLearningPathCourseProgress(supabase, user.id, publishedPaths)
    : { available: true, courses: createEmptyLearningPathCourseProgress(publishedPaths) };

  return (
    <main className={`page-shell ${styles.page}`}>
      <header className={styles.hero}>
        <div>
          <p className={styles.kicker}>GUIDED LEARNING · SYSTEMA</p>
          <h1>Не вгадуй,<br /><em>що вчити далі.</em></h1>
          <p className={styles.intro}>Обери результат — SYSTEMA покаже впорядковані курси й збере реальний прогрес без штучних mastery scores.</p>
        </div>
        <dl className={styles.summary} aria-label="Огляд навчальних шляхів">
          <div><dt>Опубліковано</dt><dd>{publishedPaths.length}</dd></div>
          <div><dt>Аудиторії</dt><dd>{availableFilters.length}</dd></div>
        </dl>
      </header>

      <nav className={styles.filters} aria-label="Фільтр навчальних шляхів">
        <Link href="/paths" aria-current={activeFilter === "all" ? "page" : undefined}>Усі</Link>
        {availableFilters.map((filter) => (
          <Link key={filter} href={`/paths?audience=${filter}`} aria-current={activeFilter === filter ? "page" : undefined}>
            {audienceLabels[filter]}
          </Link>
        ))}
      </nav>

      {!user ? (
        <aside className={styles.guestNotice}>
          <div><strong>Прогрес доступний після входу</strong><p>Гість бачить повну структуру paths і нульовий стан. Авторизований прогрес читається лише з твоїх Supabase records.</p></div>
          <Link href={`/auth/sign-in?next=${encodeURIComponent(`/paths${activeFilter === "all" ? "" : `?audience=${activeFilter}`}`)}`}>Увійти <SystemIcon name="arrow-right" /></Link>
        </aside>
      ) : null}

      {user && !progressResult.available ? (
        <div className={styles.progressError} role="status">Прогрес тимчасово недоступний. Ми не підміняємо помилку нульовими значеннями.</div>
      ) : null}

      <section aria-labelledby="pathsHeading">
        <div className={styles.sectionHeading}>
          <p>PATHS · {activeFilter.toUpperCase()}</p>
          <h2 id="pathsHeading">Шляхи до конкретного результату</h2>
        </div>

        {visiblePaths.length > 0 ? (
          <ul className={styles.grid}>
            {visiblePaths.map((path, index) => {
              const progress = buildLearningPathProgress(path, progressResult.courses);
              const optionalCourses = path.steps.filter((step) => step.requirement === "optional").length;
              return (
                <li key={path.id}>
                  <article className={styles.card}>
                    <header>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <p>{audienceLabels[path.audience]}</p>
                    </header>
                    <h3>{path.title}</h3>
                    <p className={styles.description}>{path.shortDescription}</p>
                    <div className={styles.outcome}><strong>Результат</strong><p>{path.outcome}</p></div>
                    <dl className={styles.meta}>
                      <div><dt>Курси</dt><dd>{path.steps.length}</dd></div>
                      <div><dt>Тривалість</dt><dd>{path.duration.estimatedHours} год</dd></div>
                      <div><dt>Темп</dt><dd>{path.duration.recommendedWeeks} тиж</dd></div>
                    </dl>
                    {optionalCourses > 0 ? <p className={styles.optional}>{optionalCourses} optional course не блокує завершення.</p> : null}

                    <div className={styles.progressBlock}>
                      <div><strong>{user && progressResult.available ? `${progress.percent}%` : user ? "—" : "0%"}</strong><span>{progress.completedRequiredCourses} із {progress.requiredCourses} required courses</span></div>
                      <progress value={user && progressResult.available ? progress.percent : 0} max={100} aria-label={`Прогрес шляху ${path.title}`} />
                      <p>{user && progressResult.available ? `${progress.completedUnits} із ${progress.totalUnits} навчальних кроків завершено` : user ? "Дані прогресу недоступні" : "Увійди, щоб синхронізувати прогрес"}</p>
                    </div>

                    <Link className={`primary-link ${styles.action}`} href={`/paths/${path.slug}`}>
                      Переглянути шлях <SystemIcon name="arrow-right" />
                    </Link>
                  </article>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className={styles.empty}><h3>У цій категорії ще немає published paths</h3><p>Повернися до всіх шляхів — draft content не показується як готовий.</p><Link href="/paths">Показати всі шляхи</Link></div>
        )}
      </section>
    </main>
  );
}
