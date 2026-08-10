import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const protectedLegacyPaths = new Set(["/legacy", "/legacy/", "/legacy/index.html"]);

export async function proxy(request: NextRequest) {
  const isProtectedLegacyPath = protectedLegacyPaths.has(request.nextUrl.pathname);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return isProtectedLegacyPath
      ? NextResponse.redirect(new URL("/courses/high-load-architecture/preview", request.url))
      : NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: userData } = await supabase.auth.getUser();
  if (isProtectedLegacyPath && !userData.user) {
    return NextResponse.redirect(new URL("/courses/high-load-architecture/preview", request.url));
  }
  return response;
}

export const config = {
  matcher: [
    "/legacy",
    "/legacy/",
    "/legacy/index.html",
    "/((?!_next/static|_next/image|favicon.ico|legacy/).*)",
  ],
};
