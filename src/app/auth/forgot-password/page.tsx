import type { Metadata } from "next";
import Link from "next/link";
import { EmailAuthForm } from "@/components/email-auth-form";
import { SystemIcon } from "@/components/ui/system-icon";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Відновити пароль" };

export default function ForgotPasswordPage() {
  return <main className="auth-page"><section className="auth-card"><div className="auth-symbol" aria-hidden="true"><SystemIcon name="retry" size="large" /></div><span>ACCOUNT RECOVERY</span><h1>Віднови доступ безпечно.</h1><p>Введи email. Відповідь буде однаковою незалежно від того, чи існує акаунт із такою адресою.</p><EmailAuthForm configured={isSupabaseConfigured()} mode="recovery" /><small>Recovery link короткоживучий та одноразовий. Не пересилай його іншим людям.</small><Link href="/auth/sign-in">Повернутися до входу <SystemIcon name="arrow-right" /></Link></section></main>;
}
