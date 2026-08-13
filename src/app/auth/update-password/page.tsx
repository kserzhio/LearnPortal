import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { UpdatePasswordForm } from "@/components/update-password-form";
import { SystemIcon } from "@/components/ui/system-icon";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Новий пароль" };

export default async function UpdatePasswordPage() {
  const supabase = await createSupabaseServerClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!user) redirect("/auth/sign-in?error=recovery");
  return <main className="auth-page"><section className="auth-card"><div className="auth-symbol" aria-hidden="true"><SystemIcon name="check" size="large" /></div><span>SECURE PASSWORD UPDATE</span><h1>Встанови новий пароль.</h1><p>Сторінка доступна лише з authenticated session, яку створює одноразовий recovery link.</p><UpdatePasswordForm /></section></main>;
}
