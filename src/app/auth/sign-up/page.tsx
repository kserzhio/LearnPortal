import type { Metadata } from "next";
import Link from "next/link";
import { EmailAuthForm } from "@/components/email-auth-form";
import { getSafeAuthRedirect } from "@/lib/auth/redirect";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Створити акаунт" };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const nextPath = getSafeAuthRedirect(next);
  return <main className="auth-page"><section className="auth-card"><div className="auth-symbol" aria-hidden="true">+</div><span>EMAIL REGISTRATION</span><h1>Створи навчальний акаунт.</h1><p>Після реєстрації ми надішлемо одноразове посилання для підтвердження email. До підтвердження повний курс залишається закритим.</p><EmailAuthForm configured={isSupabaseConfigured()} mode="sign-up" nextPath={nextPath} /><small>Signup і листи захищені rate limits Supabase. Повторний лист можна запитувати не частіше ніж раз на 60 секунд.</small><Link href={`/auth/sign-in?next=${encodeURIComponent(nextPath)}`}>Уже є акаунт? Увійти →</Link></section></main>;
}
