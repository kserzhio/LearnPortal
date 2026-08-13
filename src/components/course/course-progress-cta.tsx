"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SystemIcon } from "@/components/ui/system-icon";
import type { CourseSummary } from "@/content/courses";
import { buildContinueLearningState, type ContinueLearningState } from "@/lib/progress/continue-learning";
import { BrowserProgressStore } from "@/lib/progress/browser-progress-store";
import type { ResumeLesson } from "@/lib/progress/resume";

type CourseProgressCtaProps = Readonly<{
  course: CourseSummary;
  lessons: readonly ResumeLesson[];
  initialState: ContinueLearningState | null;
  authenticated: boolean;
  publicStartPath: string | null;
}>;

export function CourseProgressCta({ course, lessons, initialState, authenticated, publicStartPath }: CourseProgressCtaProps) {
  const [guestState, setGuestState] = useState<ContinueLearningState | null>(null);

  useEffect(() => {
    if (authenticated) return;
    const store = new BrowserProgressStore();
    const refresh = () => store.list(course.id).then((records) => setGuestState(buildContinueLearningState(course, lessons, records)));
    const onStorage = (event: StorageEvent) => { if (event.key === "systema-progress-v2") void refresh(); };
    void refresh();
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [authenticated, course, lessons]);

  const state = initialState ?? guestState;
  if (!state) return <p className="course-progress-loading" role="status">Завантажуємо твій прогрес…</p>;

  const guestNeedsAccess = !authenticated && state.status === "continue" && (state.nextLesson?.position ?? 1) > 1;
  const href = state.status === "start" && !authenticated
    ? publicStartPath ?? `/courses/${course.slug}`
    : guestNeedsAccess
      ? `/auth/sign-in?next=${encodeURIComponent(state.href)}`
      : state.href;
  const actionLabel = guestNeedsAccess ? "Увійти й продовжити" : state.actionLabel;
  const percent = state.totalLessons ? Math.round(state.completedLessons / state.totalLessons * 100) : 0;

  return (
    <section className="course-progress-summary" aria-labelledby="courseProgressHeading">
      <div>
        <span>{state.status === "completed" ? "КУРС ЗАВЕРШЕНО" : state.status === "continue" ? "ПРОДОВЖИТИ НАВЧАННЯ" : "ПОЧАТОК КУРСУ"}</span>
        <h3 id="courseProgressHeading">{state.nextLesson ? `Заняття ${state.nextLesson.position}. ${state.nextLesson.title}` : "Підсумок курсу готовий"}</h3>
        <p>{state.completedLessons} із {state.totalLessons} занять завершено</p>
      </div>
      <progress max={state.totalLessons} value={state.completedLessons} aria-label={`Прогрес курсу: ${state.completedLessons} із ${state.totalLessons}`}>{percent}%</progress>
      <Link className="primary-link" href={href}>{actionLabel} <SystemIcon name="arrow-right" /></Link>
    </section>
  );
}
