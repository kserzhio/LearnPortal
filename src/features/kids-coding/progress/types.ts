import type {
  KidsAttemptRecord,
  KidsProgressBundle,
  KidsUnlockRecord,
} from "./progress-model";

export interface KidsProgressStore {
  loadCourse(courseId: string): Promise<KidsProgressBundle>;
  recordAttempt(attempt: KidsAttemptRecord): Promise<KidsProgressBundle>;
  recordUnlock(courseId: string, unlock: KidsUnlockRecord): Promise<KidsProgressBundle>;
  mergeCourse(bundle: KidsProgressBundle): Promise<KidsProgressBundle>;
}
