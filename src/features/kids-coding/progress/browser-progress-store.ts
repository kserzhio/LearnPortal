import {
  KIDS_PROGRESS_SCHEMA_VERSION,
  createEmptyKidsProgress,
  mergeKidsProgressBundles,
  parseKidsProgressBundle,
  recordKidsAttempt,
  recordKidsUnlock,
  type KidsAttemptRecord,
  type KidsProgressBundle,
  type KidsProgressCatalog,
  type KidsUnlockRecord,
} from "./progress-model";
import type { KidsProgressStore } from "./types";

const STORAGE_KEY = "systema-kids-progress-v1";
const STORE_SCHEMA = "systema.kids-progress-store";

export type KidsProgressStorage = Readonly<{
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}>;

type StoredProgress = Readonly<{
  schema: typeof STORE_SCHEMA;
  schemaVersion: 1;
  courses: Readonly<Record<string, KidsProgressBundle>>;
}>;

export class BrowserKidsProgressStore implements KidsProgressStore {
  constructor(
    private readonly storage: KidsProgressStorage,
    private readonly catalogs: ReadonlyMap<string, KidsProgressCatalog> = new Map(),
  ) {}

  async loadCourse(courseId: string) {
    return this.readCourse(courseId);
  }

  async recordAttempt(attempt: KidsAttemptRecord) {
    const current = this.readCourse(attempt.courseId);
    const next = recordKidsAttempt(current, attempt, this.catalogs.get(attempt.courseId));
    this.writeCourse(next);
    return next;
  }

  async recordUnlock(courseId: string, unlock: KidsUnlockRecord) {
    const current = this.readCourse(courseId);
    const next = recordKidsUnlock(current, unlock, this.catalogs.get(courseId));
    this.writeCourse(next);
    return next;
  }

  async mergeCourse(bundle: KidsProgressBundle) {
    const parsed = parseKidsProgressBundle(bundle, this.catalogs.get(bundle.courseId));
    if (!parsed.success) throw new Error("Не вдалося прочитати Kids progress.");
    const current = this.readCourse(bundle.courseId);
    const next = mergeKidsProgressBundles(current, parsed.data, this.catalogs.get(bundle.courseId));
    this.writeCourse(next);
    return next;
  }

  private readCourse(courseId: string) {
    const stored = this.readStore();
    const candidate = stored.courses[courseId];
    if (!candidate) return createEmptyKidsProgress(courseId);
    const parsed = parseKidsProgressBundle(candidate, this.catalogs.get(courseId));
    return parsed.success ? parsed.data : createEmptyKidsProgress(courseId);
  }

  private writeCourse(bundle: KidsProgressBundle) {
    const current = this.readStore();
    const next: StoredProgress = {
      ...current,
      courses: { ...current.courses, [bundle.courseId]: bundle },
    };
    this.storage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  private readStore(): StoredProgress {
    try {
      const parsed = JSON.parse(this.storage.getItem(STORAGE_KEY) ?? "{}") as Partial<StoredProgress>;
      if (parsed.schema === STORE_SCHEMA && parsed.schemaVersion === 1 && parsed.courses && typeof parsed.courses === "object") {
        return { schema: STORE_SCHEMA, schemaVersion: 1, courses: parsed.courses };
      }
    } catch {
      // Corrupt guest progress is isolated and replaced by a valid empty store.
    }
    return {
      schema: STORE_SCHEMA,
      schemaVersion: KIDS_PROGRESS_SCHEMA_VERSION,
      courses: {},
    };
  }
}
