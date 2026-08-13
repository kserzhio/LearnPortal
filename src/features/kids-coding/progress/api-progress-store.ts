import {
  parseKidsProgressBundle,
  type KidsAttemptRecord,
  type KidsProgressBundle,
  type KidsProgressCatalog,
  type KidsUnlockRecord,
} from "./progress-model";
import type { KidsProgressStore } from "./types";

export type KidsProgressFetch = typeof fetch;

export class ApiKidsProgressStore implements KidsProgressStore {
  constructor(
    private readonly request: KidsProgressFetch = (input, init) => fetch(input, init),
    private readonly catalogs: ReadonlyMap<string, KidsProgressCatalog> = new Map(),
  ) {}

  async loadCourse(courseId: string) {
    return this.send(`/api/kids-progress?courseId=${encodeURIComponent(courseId)}`, { method: "GET" }, courseId);
  }

  async recordAttempt(attempt: KidsAttemptRecord) {
    return this.send("/api/kids-progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "record-attempt", attempt }),
    }, attempt.courseId);
  }

  async recordUnlock(courseId: string, unlock: KidsUnlockRecord) {
    return this.send("/api/kids-progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "record-unlock", courseId, unlock }),
    }, courseId);
  }

  async mergeCourse(bundle: KidsProgressBundle) {
    const chunks: KidsAttemptRecord[][] = [];
    for (let index = 0; index < bundle.attempts.length; index += 25) chunks.push(bundle.attempts.slice(index, index + 25));
    if (chunks.length === 0) chunks.push([]);
    let synchronized: KidsProgressBundle | null = null;
    for (const [index, attempts] of chunks.entries()) {
      const chunk: KidsProgressBundle = {
        ...bundle,
        levels: [],
        completedWorldIds: [],
        attempts,
        unlocks: index === 0 ? bundle.unlocks : [],
      };
      synchronized = await this.send("/api/kids-progress", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bundle: chunk }),
      }, bundle.courseId);
    }
    return synchronized as KidsProgressBundle;
  }

  private async send(url: string, init: RequestInit, courseId: string) {
    const response = await this.request(url, { ...init, credentials: "same-origin" });
    const body = await response.json().catch(() => null) as { bundle?: unknown; error?: unknown } | null;
    if (!response.ok) throw new Error(typeof body?.error === "string" ? body.error : "Не вдалося синхронізувати Kids progress.");
    const parsed = parseKidsProgressBundle(body?.bundle, this.catalogs.get(courseId));
    if (!parsed.success || parsed.data.courseId !== courseId) throw new Error("Сервер повернув некоректний Kids progress.");
    return parsed.data;
  }
}
