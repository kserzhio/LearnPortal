import type { Metadata } from "next";
import Link from "next/link";
import { courses, getCourseLessons, getCoursePublicStartPath } from "@/content/courses";
import { ServerFailureDemo } from "@/components/home/server-failure-demo";
import { HomepageProgress, type HomepageProgressData } from "@/components/home/homepage-progress";
import { SocialProof } from "@/components/home/social-proof";
import { SystemIcon } from "@/components/ui/system-icon";
import { kidsCourses } from "@/features/kids-coding/content/course-registry";
import { buildContinueLearningState } from "@/lib/progress/continue-learning";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import styles from "@/components/home/homepage.module.css";
import { createSeoMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createSeoMetadata({
  title: "Інтерактивне навчання через практику",
  description: "SYSTEMA — інтерактивні курси з System Design, високонавантажених систем, алгоритмів і JavaScript для дорослих та дітей.",
  pathname: "/",
  keywords: ["онлайн навчання", "system design", "високонавантажені системи", "програмування для дітей", "JavaScript"],
});

const highLoadCourse = courses.find((course) => course.id === "high-load-architecture");

function learningDay(startedAt: string | null) {
  if (!startedAt) return 1;
  return Math.max(1, Math.floor((Date.now() - Date.parse(startedAt)) / 86_400_000) + 1);
}

async function loadHomepageProgress(): Promise<HomepageProgressData | null> {
  const supabase = await createSupabaseServerClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!supabase || !user || !highLoadCourse) return null;
  const [progressResult, enrollmentResult, architecturesResult, attemptsResult] = await Promise.all([
    supabase.from("lesson_progress").select("lesson_id, completed, updated_at").eq("user_id", user.id).eq("course_id", highLoadCourse.id).order("updated_at", { ascending: true }),
    supabase.from("course_enrollments").select("enrolled_at").eq("user_id", user.id).eq("course_id", highLoadCourse.id).maybeSingle(),
    supabase.from("saved_architectures").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("simulator_attempts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
  ]);
  const records = progressResult.data ?? [];
  if (records.length === 0) return null;
  const lessons = getCourseLessons(highLoadCourse.id);
  const learning = buildContinueLearningState(highLoadCourse, lessons, records.map((record) => ({ lessonId: record.lesson_id, completed: record.completed, updatedAt: record.updated_at })));
  const completedLessonIds = records.filter((record) => record.completed).map((record) => record.lesson_id);
  const achievements = [
    ...(completedLessonIds.length > 0 ? ["Перше заняття"] : []),
    ...((architecturesResult.count ?? 0) > 0 ? ["Перша система"] : []),
    ...((attemptsResult.count ?? 0) > 0 ? ["Пережив відмову"] : []),
    ...(completedLessonIds.length === highLoadCourse.lessonCount ? ["Курс завершено"] : []),
  ];
  return {
    learning,
    learningDay: learningDay(enrollmentResult.data?.enrolled_at ?? records[0]?.updated_at ?? user.created_at),
    achievements,
  };
}

export default async function HomePage({ searchParams }: { searchParams: Promise<{ account?: string }> }) {
  const [{ account }, progress] = await Promise.all([searchParams, loadHomepageProgress()]);
  const publishedCourse = courses.find((course) => course.status === "published");
  const publicStartPath = publishedCourse ? getCoursePublicStartPath(publishedCourse) : null;

  return (
    <main>
      {account === "deleted" ? <div className="account-deleted-notice" role="status">Акаунт і пов’язані навчальні дані видалено.</div> : null}

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <div className={styles.heroKicker}>LEARN → BUILD → SIMULATE → CHECK</div>
          <h1>Не просто вивчай.<br /><em>Спробуй, побудуй, перевір.</em></h1>
          <p>Інтерактивні курси з програмування та технологій для дітей і дорослих. Коротка теорія, практика, симуляції та миттєвий feedback.</p>
          <div className={styles.heroActions}>
            <Link data-analytics-cta="hero-start" data-analytics-surface="homepage" href={publicStartPath ?? "/courses"}>Почати навчання <SystemIcon name="arrow-right" /></Link>
            <Link data-analytics-cta="hero-courses" data-analytics-surface="homepage" href="#featured-courses">Обрати курс</Link>
          </div>
          <ul className={styles.heroBenefits} aria-label="Переваги швидкого старту">
            <li>Без реєстрації</li><li>Інтерактивна практика</li><li>Прогрес зберігається</li>
          </ul>
        </div>
        <div className={styles.heroVisual} role="img" aria-label="Чотири кроки навчання SYSTEMA">
          <div><span>01</span><b>LEARN</b></div><div><span>02</span><b>BUILD</b></div><div><span>03</span><b>SIMULATE</b></div><div><span>04</span><b>CHECK</b></div>
        </div>
      </section>

      <ServerFailureDemo />

      <section className={styles.section} id="paths" aria-labelledby="paths-title">
        <header className={styles.sectionHeader}><div><span className={styles.sectionKicker}>НАПРЯМИ</span><h2 id="paths-title">Обери свій шлях</h2></div><p>Одна платформа й один принцип навчання — різні задачі та темп для дорослих і дітей.</p></header>
        <div className={styles.pathGrid}>
          <article className={styles.pathCard}>
            <span className={styles.pathNumber}>01 · PROFESSIONAL</span><h3>Для дорослих</h3><p>Розвивай технічні навички через практику та симуляції.</p>
            <ul className={styles.tagList}><li>System Design</li><li>Frontend</li><li>AI</li><li>QA</li><li>DevOps</li></ul>
            <Link href="/system-design">System Design <SystemIcon name="arrow-right" /></Link>
          </article>
          <article className={`${styles.pathCard} ${styles.pathCardKids}`} id="kids">
            <span className={styles.pathNumber}>02 · KIDS CODING</span><h3>Для дітей</h3><p>Програмування через гру, логіку та короткі інтерактивні завдання.</p>
            <ul className={styles.tagList}><li>JavaScript</li><li>Algorithms</li><li>Logic</li></ul>
            <Link href="/kids">Курси для дітей <SystemIcon name="arrow-right" /></Link>
          </article>
        </div>
      </section>

      <section className={styles.section} id="method" aria-labelledby="method-title">
        <header className={styles.sectionHeader}><div><span className={styles.sectionKicker}>LEARN → BUILD → SIMULATE → CHECK</span><h2 id="method-title">Як працює SYSTEMA</h2></div><p>Кожен крок переводить концепцію з тексту у власний досвід.</p></header>
        <div className={styles.methodFlow}>
          <article><span>01 · LEARN</span><h3>Зрозумій концепцію</h3><p>Короткі пояснення без зайвої теорії.</p></article>
          <article><span>02 · BUILD</span><h3>Спробуй сам</h3><p>Побудуй рішення або виконай інтерактивне завдання.</p></article>
          <article><span>03 · SIMULATE</span><h3>Запусти сценарій</h3><p>Побач, що зміниться під навантаженням або під час відмови.</p></article>
          <article><span>04 · CHECK</span><h3>Отримай feedback</h3><p>Миттєвий результат і пояснення наступного кроку.</p></article>
        </div>
      </section>

      <section className={styles.section} id="featured-courses" aria-labelledby="courses-title">
        <header className={styles.sectionHeader}><div><span className={styles.sectionKicker}>КУРСИ</span><h2 id="courses-title">Почни з практики</h2></div><p>Перший урок кожного напряму можна спробувати до реєстрації.</p></header>
        <div className={styles.courseGrid}>
          {publishedCourse ? (
            <article className={styles.courseCard}>
              <div className={styles.courseTop}><span className={styles.courseBadge}>{publishedCourse.accent}</span><span className={styles.courseLabel}>PRO · INTERACTIVE</span></div>
              <div className={styles.coursePreview} aria-hidden="true"><i /><i /><i /><i /></div>
              <h3>High Load Architecture</h3><p>Навчися проєктувати системи, які переживають високі навантаження та падіння серверів.</p>
              <ul className={styles.courseMeta}><li><span>Рівень</span><b>{publishedCourse.level}</b></li><li><span>Заняття</span><b>{publishedCourse.lessonCount}</b></li><li><span>Тривалість</span><b>{publishedCourse.duration}</b></li><li><span>Формат</span><b>Interactive</b></li></ul>
              <Link href={publicStartPath ?? `/courses/${publishedCourse.slug}`}>Почати курс <SystemIcon name="arrow-right" /></Link>
            </article>
          ) : null}
          {kidsCourses.map((course, courseIndex) => {
            const levels = course.worlds.flatMap((world) => world.levels);
            const firstWorld = course.worlds[0];
            const firstLevel = firstWorld?.levels[0];
            const href = firstWorld && firstLevel ? `/kids-coding/${course.id}/${firstWorld.id}/${firstLevel.id}` : "/courses";
            const isJavaScript = levels.some((level) => level.learningModes.includes("code"));
            return (
              <article className={`${styles.courseCard} ${styles.courseCardKids}`} id={courseIndex === 0 ? "kids-courses" : undefined} key={course.id}>
                <div className={styles.courseTop}><span className={styles.courseBadge}>{course.accent}</span><span className={styles.courseLabel}>KIDS · {course.recommendedAge.minimum}+</span></div>
                <div className={styles.coursePreview} aria-hidden="true"><i /><i /><i /><i /></div>
                <h3>{course.title}</h3><p>{isJavaScript ? "Допоможи персонажу пройти рівні, програмуючи його дії." : "Розвивай алгоритмічне мислення, керуючи героєм через логічні команди."}</p>
                <ul className={styles.courseMeta}><li><span>Вік</span><b>{course.recommendedAge.minimum}–{course.recommendedAge.maximum} років</b></li><li><span>Рівні</span><b>{levels.length}</b></li><li><span>Темп</span><b>≈10 хв / рівень</b></li><li><span>Формат</span><b>Interactive</b></li></ul>
                <Link href={href}>Почати гру <SystemIcon name="arrow-right" /></Link>
              </article>
            );
          })}
        </div>
      </section>

      {highLoadCourse ? <HomepageProgress initial={progress} course={highLoadCourse} lessons={getCourseLessons(highLoadCourse.id).map(({ id, position, title }) => ({ id, position, title }))} /> : null}

      <section className={styles.section} aria-labelledby="benefits-title">
        <header className={styles.sectionHeader}><div><span className={styles.sectionKicker}>БЕЗ ЗАЙВОГО</span><h2 id="benefits-title">Навчання, яке поміщається в день</h2></div></header>
        <div className={styles.benefitGrid}>
          <article><span>01</span><h3>10–15 хвилин</h3><p>Короткі заняття без перевантаження.</p></article>
          <article><span>02</span><h3>Практика</h3><p>Не просто читай — взаємодій.</p></article>
          <article><span>03</span><h3>Миттєвий feedback</h3><p>Одразу бачиш результат своїх рішень.</p></article>
          <article><span>04</span><h3>У своєму темпі</h3><p>Навчайся тоді, коли зручно.</p></article>
        </div>
      </section>

      <SocialProof />

      <section className={styles.finalCta} aria-labelledby="final-cta-title">
        <span>ПЕРШИЙ КРОК ВІДКРИТИЙ</span><h2 id="final-cta-title">Не просто дивись, як це працює.<br /><em>Спробуй сам.</em></h2>
        <Link data-analytics-cta="final-start" data-analytics-surface="homepage" href={publicStartPath ?? "/courses"}>Почати безкоштовно <SystemIcon name="arrow-right" /></Link>
        <p>Реєстрація не потрібна для першого заняття.</p>
      </section>
    </main>
  );
}
