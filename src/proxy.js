import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

export async function proxy(request) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Use getUser() — validates token server-side (more secure than getSession)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Public routes that don't require auth
  const publicRoutes = [
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/auth/callback",
    "/tenant-login",
    "/invite",
    "/privacy",
    "/terms",
  ];

  // API routes that must be publicly accessible
  if (
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/api/webhooks/") ||
    pathname.startsWith("/api/invite/")
  ) {
    return supabaseResponse;
  }

  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // If not logged in and trying to access protected route, redirect to login
  if (!user && !isPublicRoute && pathname !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // If logged in and trying to access auth pages, redirect to dashboard
  if (user && isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // If logged in and at root, redirect to dashboard
  if (user && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
