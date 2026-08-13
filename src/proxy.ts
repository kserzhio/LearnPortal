import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const protectedLegacyPaths = new Set(["/legacy", "/legacy/", "/legacy/index.html"]);
const highLoadPublicLessonPath = "/courses/high-load-architecture/lessons/what-is-high-load";
const kidsPreviewPathByCourse = new Map([
  ["robot-quest-algorithms", "/kids-coding/robot-quest-algorithms/village/robot-village-01"],
  ["code-adventure-javascript", "/kids-coding/code-adventure-javascript/village/code-village-01"],
]);

function lockedKidsPath(pathname: string) {
  const match = pathname.match(/^\/kids-coding\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:\/[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:-[a-z0-9]+)*)?$/);
  const previewPath = match ? kidsPreviewPathByCourse.get(match[1]) : null;
  return previewPath && pathname !== previewPath ? previewPath : null;
}

export async function proxy(request: NextRequest) {
  const isProtectedLegacyPath = protectedLegacyPaths.has(request.nextUrl.pathname);
  const kidsPreviewPath = lockedKidsPath(request.nextUrl.pathname);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    if (kidsPreviewPath) return NextResponse.redirect(new URL(kidsPreviewPath, request.url));
    return isProtectedLegacyPath
      ? NextResponse.redirect(new URL(highLoadPublicLessonPath, request.url))
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
    return NextResponse.redirect(new URL(highLoadPublicLessonPath, request.url));
  }
  if (kidsPreviewPath && !userData.user) {
    const signInUrl = new URL("/auth/sign-in", request.url);
    signInUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(signInUrl);
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
