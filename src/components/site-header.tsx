import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function SiteHeader() {
  const supabase = await createSupabaseServerClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;

  return (
    <header className="site-header">
      <Link className="site-brand" href="/" aria-label="Systema — на головну">
        <span className="site-brand-mark" aria-hidden="true"><i /><i /><i /></span>
        <span>SYSTEMA</span>
      </Link>
      <nav aria-label="Головна навігація">
        <Link href="/courses">Курси</Link>
        {user ? <Link href="/dashboard">Мій прогрес</Link> : null}
      </nav>
      <div className="auth-slot">
        {user ? (
          <>
            <span className="user-chip" title={user.email ?? "Користувач"}>
              {(user.email?.[0] ?? "U").toUpperCase()}
            </span>
            <form action="/auth/sign-out" method="post">
              <button className="quiet-button" type="submit">Вийти</button>
            </form>
          </>
        ) : (
          <Link className="header-cta" href="/auth/sign-in">Увійти</Link>
        )}
      </div>
    </header>
  );
}
