import Link from "next/link";
import { SystemIcon } from "@/components/ui/system-icon";
import { kidsCourses } from "../content/course-registry";
import styles from "./course-dashboard.module.css";

export type KidsCourseProgressSummary = Readonly<{
  courseId: string;
  completedLevelIds: readonly string[];
  startedLevelIds: readonly string[];
  stars: number;
}>;

type KidsCourseDashboardProps = Readonly<{
  variant: "catalog" | "dashboard";
  progress?: readonly KidsCourseProgressSummary[];
}>;

function levelHref(courseId: string, worldId: string, levelId: string) {
  return `/kids-coding/${courseId}/${worldId}/${levelId}`;
}

export function KidsCourseDashboard({ variant, progress = [] }: KidsCourseDashboardProps) {
  return (
    <section className={`${styles.section} ${variant === "dashboard" ? styles.dashboardVariant : ""}`} aria-labelledby={`kids-coding-${variant}-title`}>
      <header className={styles.heading}>
        <div><span>KIDS CODING</span><h2 id={`kids-coding-${variant}-title`}>{variant === "dashboard" ? "Продовжуй свою пригоду" : "Навчайся програмувати через гру"}</h2></div>
        <p>{variant === "dashboard" ? "Кожен рівень — коротка задача, видимий результат і нова ідея." : "Два короткі курси з героєм, командами та миттєвим feedback."}</p>
      </header>

      <div className={styles.grid}>
        {kidsCourses.map((course) => {
          const levels = course.worlds.flatMap((world) => world.levels.map((level) => ({ world, level })));
          const isCodeCourse = levels.some(({ level }) => level.learningModes.includes("code"));
          const summary = progress.find((entry) => entry.courseId === course.id);
          const completedIds = new Set(summary?.completedLevelIds ?? []);
          const next = levels.find(({ level }) => !completedIds.has(level.id)) ?? levels.at(-1);
          const first = levels[0];
          const destination = variant === "dashboard" && next ? next : first;
          const completed = Math.min(completedIds.size, levels.length);
          const hasStarted = (summary?.startedLevelIds.length ?? 0) > 0;
          const isComplete = levels.length > 0 && completed === levels.length;
          const progressPercent = levels.length > 0 ? Math.round(completed / levels.length * 100) : 0;
          const action = variant === "catalog" ? "Спробувати перший рівень" : isComplete ? "Переграти курс" : hasStarted ? "Продовжити" : "Почати";

          return (
            <article className={`${styles.card} ${isCodeCourse ? styles.codeCard : ""}`} key={course.id}>
              <div className={styles.cardTop}>
                <span className={styles.courseMark} aria-hidden="true">{course.accent}</span>
                <span className={styles.age}>{course.recommendedAge.minimum}+ років</span>
              </div>

              <div className={styles.miniGame} aria-hidden="true">
                <span className={styles.robot}><SystemIcon name="arrow-right" /></span><i /><i /><i /><span className={styles.goal}><SystemIcon name="flag" /></span>
              </div>

              <span className={styles.mode}>{isCodeCourse ? "CODE MODE" : "BLOCK MODE"}</span>
              <h3>{course.title}</h3>
              <p className={styles.description}>{course.shortDescription}</p>

              <dl className={styles.facts}>
                <div><dt>Світ</dt><dd>{course.worlds[0]?.title ?? "—"}</dd></div>
                <div><dt>Рівні</dt><dd>{levels.length}</dd></div>
                <div><dt>Режим</dt><dd>{isCodeCourse ? "JavaScript" : "Блоки"}</dd></div>
              </dl>

              {variant === "dashboard" ? (
                <div className={styles.progressBlock}>
                  <div><span>{completed} із {levels.length} рівнів</span><strong aria-label={`${summary?.stars ?? 0} зірок`}><SystemIcon name="star" /> {summary?.stars ?? 0}</strong></div>
                  <progress max={Math.max(levels.length, 1)} value={completed} aria-label={`Прогрес ${course.title}: ${completed} із ${levels.length} рівнів`}>{progressPercent}%</progress>
                </div>
              ) : <p className={styles.previewNote}>Перший рівень доступний без реєстрації.</p>}

              {destination ? <Link className={styles.action} href={levelHref(course.id, destination.world.id, destination.level.id)}>{action}<SystemIcon name="arrow-right" /></Link> : null}
              {variant === "dashboard" ? <Link className={styles.mapLink} href={`/kids-coding/${course.id}`}>Карта курсу <SystemIcon name="arrow-up-right" /></Link> : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
