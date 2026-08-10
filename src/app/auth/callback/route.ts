import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function safeNextPath(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"));
  const supabase = await createSupabaseServerClient();

  if (!code || !supabase) {
    return NextResponse.redirect(new URL("/auth/sign-in?error=configuration", url.origin));
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("Supabase OAuth callback failed", {
      code: error.code,
      message: error.message,
      status: error.status,
    });
    return NextResponse.redirect(new URL("/auth/sign-in?error=callback", url.origin));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
