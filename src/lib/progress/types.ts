export type LessonProgressRecord = {
  courseId: string;
  lessonId: string;
  completed: boolean;
  position: number;
  updatedAt: string;
};

export interface ProgressStore {
  list(courseId: string): Promise<LessonProgressRecord[]>;
  save(record: LessonProgressRecord): Promise<void>;
}
