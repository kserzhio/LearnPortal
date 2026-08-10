import type { Metadata } from "next";
import Link from "next/link";
import { SignInButtons } from "@/components/sign-in-buttons";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Увійти" };

export default function SignInPage() {
  const configured = isSupabaseConfigured();

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-symbol" aria-hidden="true">SK</div>
        <span>ОСОБИСТИЙ ПРОГРЕС</span>
        <h1>Продовжуй навчання<br />на будь-якому пристрої.</h1>
        <p>Увійди, щоб синхронізувати завершені заняття, simulator attempts і збережені архітектури.</p>
        <SignInButtons configured={configured} />
        <small>Вхід не надає Systema доступу до репозиторіїв, Google Drive чи інших приватних даних.</small>
        <Link href="/courses">Продовжити без входу →</Link>
      </section>
    </main>
  );
}
