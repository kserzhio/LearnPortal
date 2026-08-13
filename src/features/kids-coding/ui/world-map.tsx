import Link from "next/link";
import { SystemIcon, type SystemIconName } from "@/components/ui/system-icon";
import type { KidsWorldMap, WorldMapLevelStatus, WorldMapWorldStatus } from "../world-map";
import styles from "./world-map.module.css";

type KidsWorldMapViewProps = Readonly<{
  courseTitle: string;
  courseDescription: string;
  courseAccent: string;
  map: KidsWorldMap;
}>;

const worldStatusCopy: Readonly<Record<WorldMapWorldStatus, string>> = {
  completed: "Світ завершено",
  current: "Поточний світ",
  unlocked: "Світ відкрито",
  locked: "Світ заблоковано",
};

const levelStatusCopy: Readonly<Record<WorldMapLevelStatus, string>> = {
  completed: "Завершено",
  current: "Поточний рівень",
  available: "Доступний",
  locked: "Заблоковано",
};

const statusIcon: Readonly<Record<WorldMapLevelStatus, SystemIconName>> = {
  completed: "check",
  current: "play",
  available: "arrow-right",
  locked: "lock",
};

const themeClass: Readonly<Record<string, string>> = {
  village: styles.village,
  forest: styles.forest,
  desert: styles.desert,
  "ice-world": styles.iceWorld,
  space: styles.space,
};

function LevelNode({ courseId, level }: Readonly<{ courseId: string; level: KidsWorldMap["worlds"][number]["levels"][number] }>) {
  const content = (
    <>
      <span className={styles.levelSymbol} aria-hidden="true"><SystemIcon name={statusIcon[level.status]} /></span>
      <span className={styles.levelCopy}>
        <span className={styles.levelNumber}>РІВЕНЬ {String(level.position).padStart(2, "0")}</span>
        <strong>{level.title}</strong>
        <span>{levelStatusCopy[level.status]}</span>
      </span>
      <span className={styles.stars} aria-label={`${level.stars} із 3 зірок`}><SystemIcon name="star" /> {level.stars}/3</span>
    </>
  );

  if (level.status === "locked") {
    return <div className={`${styles.level} ${styles.lockedLevel}`} aria-label={`${level.title}. ${levelStatusCopy[level.status]}. ${level.stars} із 3 зірок`}>{content}</div>;
  }

  return (
    <Link
      className={`${styles.level} ${styles[`${level.status}Level`]}`}
      href={`/kids-coding/${courseId}/${level.worldId}/${level.id}`}
      aria-label={`${level.title}. ${levelStatusCopy[level.status]}. ${level.stars} із 3 зірок`}
      aria-current={level.status === "current" ? "step" : undefined}
    >
      {content}
    </Link>
  );
}

export function KidsWorldMapView({ courseTitle, courseDescription, courseAccent, map }: KidsWorldMapViewProps) {
  const progressPercent = map.totalLevels > 0 ? Math.round(map.completedLevels / map.totalLevels * 100) : 0;

  return (
    <main className={styles.page}>
      <nav className={styles.navigation} aria-label="Навігація курсу">
        <Link href="/dashboard"><SystemIcon name="arrow-left" /> До кабінету</Link>
        <Link href="/courses">Усі курси</Link>
      </nav>

      <header className={styles.hero}>
        <div className={styles.courseMark} aria-hidden="true">{courseAccent}</div>
        <div className={styles.heroCopy}>
          <span>KIDS CODING · КАРТА ПРИГОДИ</span>
          <h1>{courseTitle}</h1>
          <p>{courseDescription}</p>
        </div>
        <dl className={styles.summary}>
          <div><dt>Пройдено</dt><dd>{map.completedLevels}/{map.totalLevels}</dd></div>
          <div><dt>Зірки</dt><dd><SystemIcon name="star" /> {map.earnedStars}/{map.availableStars}</dd></div>
        </dl>
        <div className={styles.overallProgress}>
          <label htmlFor="world-map-progress">Загальний прогрес: {progressPercent}%</label>
          <progress
            id="world-map-progress"
            max={Math.max(map.totalLevels, 1)}
            value={map.completedLevels}
            aria-label={`Загальний прогрес: ${map.completedLevels} із ${map.totalLevels} рівнів`}
          >
            {progressPercent}%
          </progress>
        </div>
      </header>

      <section className={styles.mapSection} aria-labelledby="world-map-title">
        <div className={styles.sectionHeading}>
          <div><span>ТВІЙ МАРШРУТ</span><h2 id="world-map-title">Світи та рівні</h2></div>
          <ul className={styles.legend} aria-label="Позначення станів">
            <li><SystemIcon name="play" /> Поточний</li>
            <li><SystemIcon name="check" /> Завершено</li>
            <li><SystemIcon name="lock" /> Заблоковано</li>
          </ul>
        </div>

        <ol className={styles.worlds}>
          {map.worlds.map((world, index) => (
            <li className={`${styles.world} ${themeClass[world.themeKey] ?? styles.defaultTheme}`} key={world.id}>
              <article>
                <header className={styles.worldHeading}>
                  <span className={styles.worldNumber} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <span className={styles.worldStatus}>{worldStatusCopy[world.status]}</span>
                    <h3>{world.title}</h3>
                    <p>{world.description}</p>
                  </div>
                </header>
                <ol className={styles.levels} aria-label={`Рівні світу ${world.title}`}>
                  {world.levels.map((level) => <li key={level.id}><LevelNode courseId={map.courseId} level={level} /></li>)}
                </ol>
              </article>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
