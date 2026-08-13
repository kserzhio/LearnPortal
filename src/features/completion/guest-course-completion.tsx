"use client";

import { useEffect, useState } from "react";
import type { CourseDefinition, CourseSummary } from "@/content/courses";
import { CourseCompletionView } from "@/features/completion/course-completion-view";
import { buildCourseCompletionSnapshot, type CourseCompletionSnapshot } from "@/features/completion/completion";
import { BrowserProgressStore } from "@/lib/progress/browser-progress-store";

export function GuestCourseCompletion({ course, definition, knowledgeCheckIds }: Readonly<{ course: CourseSummary; definition: CourseDefinition; knowledgeCheckIds: readonly string[] }>) {
  const [snapshot, setSnapshot] = useState<CourseCompletionSnapshot | null>(null);

  useEffect(() => {
    const store = new BrowserProgressStore();
    store.list(course.id).then((records) => setSnapshot(buildCourseCompletionSnapshot(
      definition,
      records.map((record) => ({ lessonId: record.lessonId, completed: record.completed, updatedAt: record.updatedAt })),
      knowledgeCheckIds,
      null,
    )));
  }, [course.id, definition, knowledgeCheckIds]);

  if (!snapshot) return <main className="page-shell completion-page"><p className="completion-loading" role="status">Завантажуємо прогрес курсу…</p></main>;
  return <CourseCompletionView snapshot={snapshot} course={course} authenticated={false} />;
}
