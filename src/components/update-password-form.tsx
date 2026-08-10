"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function UpdatePasswordForm() {
  const [message, setMessage] = useState("");
  const [complete, setComplete] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("passwordConfirmation") ?? "");
    if (password.length < 12) return setMessage("Пароль має містити щонайменше 12 символів.");
    if (password !== confirmation) return setMessage("Паролі не збігаються.");

    setPending(true);
    setMessage("");
    const { error } = await createSupabaseBrowserClient().auth.updateUser({ password });
    if (error) {
      setMessage("Посилання прострочене або password update не вдалося. Запроси новий recovery link.");
      setPending(false);
      return;
    }
    event.currentTarget.reset();
    setComplete(true);
    setPending(false);
    setMessage("Пароль оновлено. Твоя поточна сесія залишається активною.");
  }

  return (
    <form className="email-auth-form" onSubmit={submit} aria-describedby="passwordUpdateMessage">
      <label htmlFor="new-password">Новий пароль</label>
      <input id="new-password" name="password" type="password" minLength={12} autoComplete="new-password" required disabled={pending || complete} />
      <label htmlFor="new-password-confirmation">Повтори новий пароль</label>
      <input id="new-password-confirmation" name="passwordConfirmation" type="password" minLength={12} autoComplete="new-password" required disabled={pending || complete} />
      <small>Щонайменше 12 символів. Після зміни не передавай пароль нікому.</small>
      <button type="submit" disabled={pending || complete}>{pending ? "Оновлення…" : "Оновити пароль"}</button>
      <p id="passwordUpdateMessage" className="auth-message" role="status" aria-live="polite">{message}</p>
      {complete ? <Link className="auth-inline-link" href="/dashboard">Перейти до dashboard →</Link> : null}
    </form>
  );
}
