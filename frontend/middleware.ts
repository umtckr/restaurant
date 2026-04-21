import { NextRequest, NextResponse } from "next/server";

const PROTECTED = ["/dashboard", "/platform"];
const PUBLIC = ["/login", "/register", "/", "/pricing", "/contact", "/privacy", "/terms"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!isProtected) return NextResponse.next();

  const token =
    request.cookies.get("access_token")?.value ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/platform/:path*"],
};
