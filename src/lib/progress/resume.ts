export type ResumeLesson = {
  id: string;
  position: number;
  title: string;
};

export type ResumeProgress = {
  lessonId: string;
  completed: boolean;
  updatedAt: string;
};

export type CourseResume = {
  lesson: ResumeLesson;
  mode: "start" | "continue" | "repeat";
  lastActivityAt: string | null;
};

export function getCourseResume(lessons: ResumeLesson[], progress: ResumeProgress[]): CourseResume | null {
  const orderedLessons = lessons.toSorted((first, second) => first.position - second.position);
  const firstLesson = orderedLessons[0];
  if (!firstLesson) return null;

  const completedLessonIds = new Set(progress.filter((item) => item.completed).map((item) => item.lessonId));
  const latestProgress = progress.reduce<ResumeProgress | null>((latest, item) => {
    if (!latest) return item;
    return Date.parse(item.updatedAt) > Date.parse(latest.updatedAt) ? item : latest;
  }, null);

  if (orderedLessons.every((lesson) => completedLessonIds.has(lesson.id))) {
    return { lesson: firstLesson, mode: "repeat", lastActivityAt: latestProgress?.updatedAt ?? null };
  }

  if (!latestProgress) return { lesson: firstLesson, mode: "start", lastActivityAt: null };

  const latestLesson = orderedLessons.find((lesson) => lesson.id === latestProgress.lessonId);
  if (latestLesson && !latestProgress.completed) {
    return { lesson: latestLesson, mode: "continue", lastActivityAt: latestProgress.updatedAt };
  }

  const nextLesson = orderedLessons.find((lesson) => (
    lesson.position > (latestLesson?.position ?? 0) && !completedLessonIds.has(lesson.id)
  )) ?? orderedLessons.find((lesson) => !completedLessonIds.has(lesson.id)) ?? firstLesson;

  return { lesson: nextLesson, mode: "continue", lastActivityAt: latestProgress.updatedAt };
}

export function getResumeLabel(resume: CourseResume) {
  if (resume.mode === "repeat") return "Повторити курс";
  if (resume.mode === "start") return `Почати заняття ${resume.lesson.position}`;
  return `Продовжити заняття ${resume.lesson.position}`;
}
