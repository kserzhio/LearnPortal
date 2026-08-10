import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/app/profile/profile-form";
import { DeleteAccountForm } from "@/app/profile/delete-account-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Профіль" };

const providerLabels: Record<string, string> = {
  github: "GitHub",
  google: "Google",
};

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;

  if (!user || !supabase) redirect("/auth/sign-in?next=/profile");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url, updated_at")
    .eq("id", user.id)
    .maybeSingle();

  const initialDisplayName = profile?.display_name
    ?? user.user_metadata?.full_name
    ?? user.user_metadata?.name
    ?? "Користувач Systema";
  const provider = String(user.app_metadata?.provider ?? "oauth");
  const initials = initialDisplayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part: string) => part[0])
    .join("")
    .toUpperCase();

  return (
    <main className="page-shell profile-page">
      <header className="profile-heading">
        <div>
          <span>ACCOUNT SETTINGS</span>
          <h1>Твій профіль</h1>
          <p>Керуй даними, які використовуються у навчальному кабінеті.</p>
        </div>
        <span className="profile-avatar" aria-hidden="true">{initials || "SK"}</span>
      </header>

      <div className="profile-layout">
        <section className="profile-panel" aria-labelledby="profileDetailsHeading">
          <span>ОСОБИСТІ ДАНІ</span>
          <h2 id="profileDetailsHeading">Як до тебе звертатися</h2>
          <ProfileForm initialDisplayName={initialDisplayName} />
        </section>

        <aside className="account-panel" aria-labelledby="accountHeading">
          <span>ОБЛІКОВИЙ ЗАПИС</span>
          <h2 id="accountHeading">Авторизація</h2>
          <dl>
            <div><dt>Email</dt><dd>{user.email ?? "Не вказано"}</dd></div>
            <div><dt>Провайдер</dt><dd>{providerLabels[provider] ?? provider}</dd></div>
            <div><dt>Синхронізація</dt><dd>Supabase увімкнено</dd></div>
          </dl>
          <p>Критичні зміни потребують повторної авторизації та перевіряються на сервері.</p>
        </aside>
      </div>

      <section className="delete-account-panel" aria-labelledby="deleteAccountHeading">
        <span>DANGER ZONE</span>
        <h2 id="deleteAccountHeading">Видалення акаунта</h2>
        <p>Ця дія видаляє identity у Supabase Auth і всі пов’язані навчальні дані через database cascade.</p>
        <DeleteAccountForm />
      </section>
    </main>
  );
}
