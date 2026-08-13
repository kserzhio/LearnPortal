import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SystemIcon } from "@/components/ui/system-icon";

export async function SiteHeader() {
  const supabase = await createSupabaseServerClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const profile = user && supabase ? await supabase.from("profiles").select("role").eq("id",user.id).maybeSingle() : null;
  const canViewGrowth = ["ADMIN","INSTRUCTOR"].includes(profile?.data?.role ?? "");

  return (
    <header className="site-header">
      <Link className="site-brand" href="/" aria-label="Systema — на головну">
        <span className="site-brand-mark" aria-hidden="true"><i /><i /><i /></span>
        <span>SYSTEMA</span>
      </Link>
      <nav aria-label="Головна навігація">
        <Link href="/courses">Курси</Link>
        <Link href="/paths">Шляхи</Link>
        <Link href="/skills">Навички</Link>
        <Link href="/system-design">System Design</Link>
        <Link href="/kids">Для дітей</Link>
        <Link href="/#method">Як це працює</Link>
        {user ? <Link href="/dashboard">Продовжити</Link> : null}
        {canViewGrowth ? <Link href="/dashboard/growth">Аналітика</Link> : null}
      </nav>
      <div className="auth-slot">
        {user ? (
          <>
            <Link className="user-chip" href="/profile" aria-label="Відкрити профіль" title={user.email ?? "Користувач"}>
              <SystemIcon name="user" />
            </Link>
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
