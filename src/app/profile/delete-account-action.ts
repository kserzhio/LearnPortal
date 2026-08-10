"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const DELETE_CONFIRMATION = "ВИДАЛИТИ МІЙ АКАУНТ";
const DELETE_RPC_CONFIRMATION = "DELETE_ACCOUNT_CONFIRMED_V1";

export type DeleteAccountState = {
  status: "idle" | "error";
  message: string;
};

export async function deleteAccount(_previousState: DeleteAccountState, formData: FormData): Promise<DeleteAccountState> {
  const confirmation = typeof formData.get("confirmation") === "string" ? String(formData.get("confirmation")).trim() : "";
  const acknowledgement = formData.get("acknowledgement") === "accepted";
  if (confirmation !== DELETE_CONFIRMATION || !acknowledgement) {
    return { status: "error", message: "Контрольна фраза або підтвердження неправильні. Акаунт не видалено." };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { status: "error", message: "Supabase не налаштовано. Акаунт не видалено." };
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { status: "error", message: "Сесія завершилася. Увійди ще раз." };

  const { error } = await supabase.rpc("delete_own_account", { confirmation_phrase: DELETE_RPC_CONFIRMATION });
  if (error) {
    const needsReauthentication = error.message.includes("reauthentication_required");
    return {
      status: "error",
      message: needsReauthentication
        ? "Для видалення потрібна свіжа авторизація. Вийди, увійди знову й повтори дію протягом 15 хвилин."
        : "Не вдалося видалити акаунт. Дані залишилися без змін.",
    };
  }

  await supabase.auth.signOut({ scope: "local" });
  redirect("/?account=deleted");
}
