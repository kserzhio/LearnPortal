"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Provider = "google" | "github";

export function SignInButtons({ configured, nextPath }: { configured: boolean; nextPath: string }) {
  const [message, setMessage] = useState("");
  const [pendingProvider, setPendingProvider] = useState<Provider | null>(null);

  async function signIn(provider: Provider) {
    if (!configured) return;
    setPendingProvider(provider);
    setMessage("");

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}` },
    });

    if (error) {
      setMessage("Не вдалося розпочати вхід. Спробуй ще раз або обери інший provider.");
      setPendingProvider(null);
    }
  }

  return (
    <div className="sign-in-actions">
      <button type="button" disabled={!configured || pendingProvider !== null} onClick={() => signIn("google")}>
        <span aria-hidden="true">G</span>{pendingProvider === "google" ? "Перенаправлення…" : "Продовжити з Google"}
      </button>
      <button type="button" disabled={!configured || pendingProvider !== null} onClick={() => signIn("github")}>
        <span aria-hidden="true">GH</span>{pendingProvider === "github" ? "Перенаправлення…" : "Продовжити з GitHub"}
      </button>
      <p className="auth-message" role="status" aria-live="polite">
        {message || (!configured ? "Додай Supabase URL і publishable key у .env.local, щоб активувати вхід." : "")}
      </p>
    </div>
  );
}
