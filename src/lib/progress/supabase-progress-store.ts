"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { LessonProgressRecord, ProgressStore } from "@/lib/progress/types";

type ProgressRow = {
  course_id: string;
  lesson_id: string;
  completed: boolean;
  position: number;
  updated_at: string;
};

export class SupabaseProgressStore implements ProgressStore {
  constructor(private readonly supabase: SupabaseClient) {}

  async list(courseId: string): Promise<LessonProgressRecord[]> {
    const { data, error } = await this.supabase
      .from("lesson_progress")
      .select("course_id, lesson_id, completed, position, updated_at")
      .eq("course_id", courseId);

    if (error) throw new Error("Не вдалося завантажити прогрес.");
    return ((data ?? []) as ProgressRow[]).map((row) => ({
      courseId: row.course_id,
      lessonId: row.lesson_id,
      completed: row.completed,
      position: row.position,
      updatedAt: row.updated_at,
    }));
  }

  async save(record: LessonProgressRecord) {
    const { data: userData, error: userError } = await this.supabase.auth.getUser();
    if (userError || !userData.user) throw new Error("Потрібно увійти для синхронізації прогресу.");

    const { error } = await this.supabase.from("lesson_progress").upsert({
      user_id: userData.user.id,
      course_id: record.courseId,
      lesson_id: record.lessonId,
      completed: record.completed,
      position: record.position,
      updated_at: record.updatedAt,
    }, { onConflict: "user_id,course_id,lesson_id" });

    if (error) throw new Error("Не вдалося синхронізувати прогрес.");
  }
}
