import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { accessCookieName } from "./lib/server-auth";

const protectedPrefixes = ["/", "/dashboard", "/updates", "/people"];

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const supabaseEnabled = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  if (!supabaseEnabled || pathname === "/login" || pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const isProtected = protectedPrefixes.some((prefix) =>
    prefix === "/" ? pathname === "/" : pathname.startsWith(prefix),
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get(accessCookieName())?.value;
  if (accessToken) {
    return NextResponse.next();
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/updates/:path*", "/people/:path*"],
};

