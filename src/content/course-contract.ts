export type CourseStatus = "published" | "planned";

export type LessonTopic = Readonly<{
  id: string;
  title: string;
  description: string;
}>;

export type LessonPractice = Readonly<{
  title: string;
  tasks: readonly string[];
  deliverable: string;
  validation: Readonly<{
    expectedSuccess: string;
    expectedFailures: readonly string[];
  }>;
}>;

export type LessonDefinition = Readonly<{
  id: string;
  moduleId: string;
  position: number;
  title: string;
  durationMinutes: number;
  summary: string;
  topics: readonly LessonTopic[];
  practice: LessonPractice;
  outcome: string;
  legacyAnchor: `#lesson-${number}`;
  seo?: Readonly<{
    slug: string;
    keywords: readonly string[];
  }>;
}>;

export type CourseModuleDefinition = Readonly<{
  id: string;
  position: number;
  title: string;
  summary: string;
  lessons: readonly LessonDefinition[];
}>;

export type CourseDefinition = Readonly<{
  id: string;
  slug: string;
  title: string;
  description: string;
  duration: string;
  level: string;
  status: "published";
  accent: string;
  legacyPath: string;
  modules: readonly CourseModuleDefinition[];
}>;

export type CourseSummary = Readonly<{
  id: string;
  slug: string;
  title: string;
  description: string;
  lessonCount: number;
  duration: string;
  level: string;
  status: CourseStatus;
  accent: string;
  legacyPath?: string;
}>;

export function defineCourse(course: CourseDefinition): CourseDefinition {
  const moduleIds = new Set<string>();
  const lessonIds = new Set<string>();
  const lessonPositions = new Set<number>();

  for (const [moduleIndex, courseModule] of course.modules.entries()) {
    if (courseModule.position !== moduleIndex + 1) throw new Error(`Invalid module position: ${courseModule.id}`);
    if (moduleIds.has(courseModule.id)) throw new Error(`Duplicate module id: ${courseModule.id}`);
    moduleIds.add(courseModule.id);

    for (const lesson of courseModule.lessons) {
      if (lesson.moduleId !== courseModule.id) throw new Error(`Lesson ${lesson.id} has the wrong moduleId`);
      if (lessonIds.has(lesson.id)) throw new Error(`Duplicate lesson id: ${lesson.id}`);
      if (lessonPositions.has(lesson.position)) throw new Error(`Duplicate lesson position: ${lesson.position}`);
      if (lesson.legacyAnchor !== `#lesson-${lesson.position}`) throw new Error(`Invalid legacy anchor: ${lesson.id}`);
      lessonIds.add(lesson.id);
      lessonPositions.add(lesson.position);
    }
  }

  const orderedPositions = [...lessonPositions].toSorted((first, second) => first - second);
  if (orderedPositions.some((position, index) => position !== index + 1)) {
    throw new Error(`Course ${course.id} lesson positions must be continuous and start at 1`);
  }

  return course;
}

export function getLessons(course: CourseDefinition): readonly LessonDefinition[] {
  return course.modules.flatMap((courseModule) => courseModule.lessons);
}

export function toCourseSummary(course: CourseDefinition): CourseSummary {
  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    description: course.description,
    lessonCount: getLessons(course).length,
    duration: course.duration,
    level: course.level,
    status: course.status,
    accent: course.accent,
    legacyPath: course.legacyPath,
  };
}
