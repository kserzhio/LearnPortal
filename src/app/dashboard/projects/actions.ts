"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type DeleteCompletedProjectState = Readonly<{ status: "idle" | "success" | "error"; message: string }>;

export async function deleteCompletedProject(_previous: DeleteCompletedProjectState, formData: FormData): Promise<DeleteCompletedProjectState> {
  const artifactId = String(formData.get("artifactId") ?? "");
  const confirmed = formData.get("confirmed") === "on";
  if (!UUID.test(artifactId) || !confirmed) return { status: "error", message: "Підтвердь видалення вибраного проєкту." };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { status: "error", message: "Синхронізація зараз недоступна." };
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return { status: "error", message: "Сесія завершилась. Увійди ще раз." };

  const { data, error } = await supabase.from("saved_architectures").delete().eq("id", artifactId).eq("user_id", user.id).not("completed_at", "is", null).select("id");
  if (error) return { status: "error", message: "Не вдалося видалити проєкт. Спробуй ще раз." };
  if (!data?.length) return { status: "error", message: "Проєкт не знайдено або вже видалено." };
  revalidatePath("/dashboard/projects");
  revalidatePath("/dashboard");
  revalidatePath("/profile");
  return { status: "success", message: "Проєкт видалено з приватної бібліотеки." };
}
