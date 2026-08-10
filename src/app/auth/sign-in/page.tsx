import type { Metadata } from "next";
import Link from "next/link";
import { EmailAuthForm } from "@/components/email-auth-form";
import { SignInButtons } from "@/components/sign-in-buttons";
import { getSafeAuthRedirect } from "@/lib/auth/redirect";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Увійти" };

const authErrors: Record<string, string> = {
  callback: "Не вдалося завершити OAuth-вхід. Спробуй ще раз.",
  configuration: "OAuth ще не повністю налаштований.",
  link: "Email-посилання неправильне або прострочене. Запроси нове.",
  recovery: "Спочатку запроси нове посилання для відновлення пароля.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const configured = isSupabaseConfigured();
  const { error, next } = await searchParams;
  const nextPath = getSafeAuthRedirect(next);
  const errorMessage = error ? authErrors[error] ?? "Не вдалося виконати вхід." : "";

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-symbol" aria-hidden="true">SK</div>
        <span>ОСОБИСТИЙ ПРОГРЕС</span>
        <h1>Продовжуй навчання<br />на будь-якому пристрої.</h1>
        <p>Увійди, щоб синхронізувати завершені заняття, simulator attempts і збережені архітектури.</p>
        {errorMessage ? <p className="auth-error" role="alert">{errorMessage}</p> : null}
        <EmailAuthForm configured={configured} mode="sign-in" nextPath={nextPath} />
        <div className="auth-secondary-links"><Link href={`/auth/sign-up?next=${encodeURIComponent(nextPath)}`}>Створити акаунт</Link><Link href="/auth/forgot-password">Забув пароль?</Link></div>
        <div className="auth-divider"><span>або</span></div>
        <SignInButtons configured={configured} nextPath={nextPath} />
        <small>Вхід не надає Systema доступу до репозиторіїв, Google Drive чи інших приватних даних.</small>
        <Link href="/courses">Продовжити без входу →</Link>
      </section>
    </main>
  );
}
