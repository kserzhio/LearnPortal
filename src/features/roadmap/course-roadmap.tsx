"use client";

import { useActionState } from "react";
import Link from "next/link";
import { updateRoadmapVote, type RoadmapVoteActionState } from "@/app/courses/roadmap-actions";
import { SystemIcon } from "@/components/ui/system-icon";
import type { RoadmapCourse } from "@/features/roadmap/roadmap";

export function CourseRoadmap({ courses, authenticated, available }: Readonly<{ courses: readonly RoadmapCourse[]; authenticated: boolean; available: boolean }>) {
  const initialState: RoadmapVoteActionState = { status: "idle", message: "", selectedSlug: courses.find((course) => course.selected)?.slug ?? null, courses };
  const [state, formAction, pending] = useActionState(updateRoadmapVote, initialState);

  return (
    <section className="roadmap-section" aria-labelledby="roadmapHeading">
      <header className="roadmap-heading">
        <div><span>COMMUNITY ROADMAP</span><h2 id="roadmapHeading">Який курс створити наступним?</h2></div>
        <p>Голосування допомагає визначити пріоритет. Воно не є обіцянкою дати релізу.</p>
      </header>
      <div className="roadmap-grid">
        {state.courses.map((course) => (
          <article className={course.selected ? "selected" : ""} key={course.slug}>
            <div className="roadmap-card-top"><span aria-hidden="true">{course.accent}</span><strong>{course.selected ? "ТВІЙ ВИБІР" : "PLANNED"}</strong></div>
            <h3>{course.title}</h3>
            <p>{course.description}</p>
            <dl>
              <dt>{available ? "Голосів" : "Статистика"}</dt>
              <dd>{available ? course.voteCount : "—"}</dd>
            </dl>
            {authenticated && available ? (
              <form action={formAction}>
                <input type="hidden" name="courseSlug" value={course.slug} />
                <button type="submit" disabled={pending} aria-pressed={course.selected}>
                  {pending ? "Зберігаємо…" : course.selected ? "Скасувати голос" : state.selectedSlug ? "Перенести голос сюди" : "Проголосувати"}
                  <SystemIcon name={course.selected ? "close" : "arrow-right"} />
                </button>
              </form>
            ) : authenticated ? <p className="roadmap-unavailable">Голосування тимчасово недоступне.</p> : (
              <Link href={`/auth/sign-in?next=${encodeURIComponent("/courses#roadmap")}`}>Увійти, щоб проголосувати <SystemIcon name="arrow-right" /></Link>
            )}
          </article>
        ))}
      </div>
      <p className="roadmap-message" data-status={state.status} aria-live="polite">{state.message}</p>
      <p className="roadmap-policy">Один акаунт — один голос. Його можна перенести або скасувати будь-коли.</p>
    </section>
  );
}
