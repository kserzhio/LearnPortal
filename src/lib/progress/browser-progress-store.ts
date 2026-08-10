"use client";

import type { LessonProgressRecord, ProgressStore } from "@/lib/progress/types";

const STORAGE_KEY = "systema-progress-v2";

export class BrowserProgressStore implements ProgressStore {
  async list(courseId: string) {
    return this.read().filter((record) => record.courseId === courseId);
  }

  async save(record: LessonProgressRecord) {
    const records = this.read();
    const index = records.findIndex(
      (item) => item.courseId === record.courseId && item.lessonId === record.lessonId,
    );

    if (index >= 0) records[index] = record;
    else records.push(record);

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, records }));
  }

  private read(): LessonProgressRecord[] {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as {
        version?: number;
        records?: LessonProgressRecord[];
      };
      return parsed.version === 2 && Array.isArray(parsed.records) ? parsed.records : [];
    } catch {
      return [];
    }
  }
}
