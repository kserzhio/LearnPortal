"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const MIN_DISPLAY_NAME_LENGTH = 2;
const MAX_DISPLAY_NAME_LENGTH = 80;

export type ProfileActionState = {
  status: "idle" | "success" | "error";
  message: string;
  displayName: string;
};

function normalizeDisplayName(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

export async function updateProfile(
  _previousState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const displayName = normalizeDisplayName(formData.get("displayName"));

  if (displayName.length < MIN_DISPLAY_NAME_LENGTH || displayName.length > MAX_DISPLAY_NAME_LENGTH) {
    return {
      status: "error",
      message: `Ім’я має містити від ${MIN_DISPLAY_NAME_LENGTH} до ${MAX_DISPLAY_NAME_LENGTH} символів.`,
      displayName,
    };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { status: "error", message: "Supabase ще не налаштовано.", displayName };
  }

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) {
    return { status: "error", message: "Сесія завершилася. Увійди ще раз.", displayName };
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ display_name: displayName, updated_at: new Date().toISOString() })
    .eq("id", user.id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { status: "error", message: "Не вдалося зберегти профіль. Спробуй ще раз.", displayName };
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");

  return { status: "success", message: "Профіль збережено.", displayName };
}
