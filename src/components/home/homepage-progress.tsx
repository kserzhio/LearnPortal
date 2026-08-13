"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SystemIcon } from "@/components/ui/system-icon";
import type { CourseSummary } from "@/content/courses";
import { buildContinueLearningState, type ContinueLearningState } from "@/lib/progress/continue-learning";
import type { ResumeLesson } from "@/lib/progress/resume";
import styles from "./homepage.module.css";

export type HomepageProgressData = Readonly<{
  learning: ContinueLearningState;
  learningDay: number;
  achievements: readonly string[];
}>;

type LocalRecord = { courseId?: string; lessonId?: string; completed?: boolean; updatedAt?: string };

function dayLabel(days: number) {
  const modulo100 = days % 100;
  const modulo10 = days % 10;
  if (modulo100 >= 11 && modulo100 <= 14) return "днів";
  if (modulo10 === 1) return "день";
  if (modulo10 >= 2 && modulo10 <= 4) return "дні";
  return "днів";
}

function localProgress(course: CourseSummary, lessons: readonly ResumeLesson[]): HomepageProgressData | null {
  try {
    const source = localStorage.getItem("systema-progress-v2");
    const stored = JSON.parse(source ?? "{}") as { version?: number; records?: LocalRecord[] };
    const records = stored.version === 2 && Array.isArray(stored.records)
      ? stored.records.filter((record) => record.courseId === course.id && record.lessonId && record.updatedAt)
      : [];
    if (records.length === 0) return null;
    const firstDate = records.reduce((earliest, record) => {
      const value = Date.parse(record.updatedAt ?? "");
      return value > 0 && value < earliest ? value : earliest;
    }, Number.POSITIVE_INFINITY);
    const learningDay = Number.isFinite(firstDate) ? Math.max(1, Math.floor((Date.now() - firstDate) / 86_400_000) + 1) : 1;
    const learning = buildContinueLearningState(course, lessons, records.map((record) => ({
      lessonId: record.lessonId as string,
      completed: Boolean(record.completed),
      updatedAt: record.updatedAt as string,
    })));
    return {
      learning,
      learningDay,
      achievements: learning.completedLessons > 0 ? ["Перше заняття"] : [],
    };
  } catch {
    return null;
  }
}

export function HomepageProgress({ initial, course, lessons }: Readonly<{ initial: HomepageProgressData | null; course: CourseSummary; lessons: readonly ResumeLesson[] }>) {
  const [local, setLocal] = useState<HomepageProgressData | null>(null);
  useEffect(() => {
    if (initial) return;
    const refresh = () => setLocal(localProgress(course, lessons));
    const onStorage = (event: StorageEvent) => { if (event.key === "systema-progress-v2") refresh(); };
    refresh();
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [course, initial, lessons]);

  const progress = initial ?? local;
  if (!progress) return null;
  const { learning } = progress;
  const percent = learning.totalLessons ? Math.round(learning.completedLessons / learning.totalLessons * 100) : 0;

  return (
    <section className={styles.progressSection} aria-labelledby="home-progress-title">
      <div className={styles.progressHeading}>
        <div><span>ТВІЙ ПРОГРЕС</span><h2 id="home-progress-title">Продовжуй з останнього кроку</h2></div>
        <p className={styles.streak}><SystemIcon name="flame" /> {progress.learningDay} {dayLabel(progress.learningDay)} навчання</p>
      </div>
      <div className={styles.progressCard}>
        <div>
          <span>{learning.courseTitle}</span>
          <strong>{learning.completedLessons} / {learning.totalLessons} занять</strong>
          <progress max={learning.totalLessons} value={learning.completedLessons} aria-label={`Прогрес курсу: ${learning.completedLessons} із ${learning.totalLessons} занять`}>{percent}%</progress>
        </div>
        <div className={styles.nextLesson}>
          <span>{learning.status === "completed" ? "КУРС ЗАВЕРШЕНО" : "НАСТУПНИЙ КРОК"}</span>
          <h3>{learning.nextLesson ? `Заняття ${learning.nextLesson.position}. ${learning.nextLesson.title}` : "Підсумок і Certificate of Completion"}</h3>
          <p>{learning.status === "completed" ? "Переглянь результати курсу та свій сертифікат." : "Повернися одразу до потрібного заняття без повторного пошуку."}</p>
        </div>
        {progress.achievements.length > 0 ? <div className={styles.achievements} aria-label="Досягнення">{progress.achievements.map((achievement) => <span key={achievement}><SystemIcon name="trophy" /> {achievement}</span>)}</div> : null}
        <Link className={styles.progressAction} href={learning.href}>{learning.actionLabel} <SystemIcon name="arrow-right" /></Link>
      </div>
    </section>
  );
}
