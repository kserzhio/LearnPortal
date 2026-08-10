"use client";

import { FormEvent, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type EmailAuthMode = "sign-in" | "sign-up" | "recovery";

const genericEmailMessage = "Якщо адреса може отримувати листи від Systema, перевір пошту та виконай інструкції.";

export function EmailAuthForm({ configured, mode, nextPath = "/dashboard" }: { configured: boolean; mode: EmailAuthMode; nextPath?: string }) {
  const [message, setMessage] = useState("");
  const [complete, setComplete] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured || pending || complete) return;
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");
    const passwordConfirmation = String(form.get("passwordConfirmation") ?? "");

    if (mode !== "recovery" && password.length < 12) {
      setMessage("Пароль має містити щонайменше 12 символів.");
      return;
    }
    if (mode === "sign-up" && password !== passwordConfirmation) {
      setMessage("Паролі не збігаються.");
      return;
    }

    setPending(true);
    setMessage("");
    const supabase = createSupabaseBrowserClient();
    if (mode === "sign-in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage("Email або пароль неправильні. Перевір дані або віднови пароль.");
        setPending(false);
        return;
      }
      window.location.assign(nextPath);
      return;
    }

    const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(mode === "recovery" ? "/auth/update-password" : nextPath)}`;
    const result = mode === "sign-up"
      ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: callbackUrl } })
      : await supabase.auth.resetPasswordForEmail(email, { redirectTo: callbackUrl });
    const { error } = result;

    setMessage(error?.status === 429
      ? "Забагато запитів. Зачекай щонайменше 60 секунд перед повторною спробою."
      : error
        ? "Запит не вдалося завершити. Спробуй пізніше."
        : genericEmailMessage);
    setComplete(!error);
    setPending(false);
  }

  const submitLabel = mode === "sign-in" ? "Увійти через email" : mode === "sign-up" ? "Створити акаунт" : "Надіслати recovery link";
  return (
    <form className="email-auth-form" onSubmit={submit} aria-describedby="emailAuthMessage">
      <label htmlFor={`${mode}-email`}>Email</label>
      <input id={`${mode}-email`} name="email" type="email" inputMode="email" autoComplete="email" required disabled={!configured || pending || complete} />
      {mode !== "recovery" ? <><label htmlFor={`${mode}-password`}>Пароль</label><input id={`${mode}-password`} name="password" type="password" minLength={12} autoComplete={mode === "sign-in" ? "current-password" : "new-password"} required disabled={!configured || pending || complete} /></> : null}
      {mode === "sign-up" ? <><label htmlFor="sign-up-password-confirmation">Повтори пароль</label><input id="sign-up-password-confirmation" name="passwordConfirmation" type="password" minLength={12} autoComplete="new-password" required disabled={!configured || pending || complete} /><small>Щонайменше 12 символів. Не використовуй пароль від іншого сервісу.</small></> : null}
      <button type="submit" disabled={!configured || pending || complete}>{complete ? "Лист надіслано" : pending ? "Обробка…" : submitLabel}</button>
      <p id="emailAuthMessage" className="auth-message" role="status" aria-live="polite">{message || (!configured ? "Email auth стане доступним після налаштування Supabase." : "")}</p>
    </form>
  );
}
