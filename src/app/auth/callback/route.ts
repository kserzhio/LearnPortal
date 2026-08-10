import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSafeAuthRedirect } from "@/lib/auth/redirect";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = getSafeAuthRedirect(url.searchParams.get("next"));
  const providerError = url.searchParams.get("error") || url.searchParams.get("error_code");

  if (providerError) {
    return NextResponse.redirect(new URL("/auth/sign-in?error=link", url.origin));
  }
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
