import { NextResponse } from "next/server";
import { auth } from "@/lib/session";

const PUBLIC_PATHS = ["/login", "/auth/callback", "/api/auth"];

export const proxy = auth((request) => {
  const { pathname, search } = request.nextUrl;

  // The design showcase is a dev tool only.
  if (pathname.startsWith("/design") && process.env.NODE_ENV === "production") {
    return new NextResponse(null, { status: 404 });
  }

  const signedIn = !!request.auth?.user?.id;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!signedIn && !isPublic) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(loginUrl);
  }

  if (signedIn && pathname === "/login") {
    const home = request.nextUrl.clone();
    home.pathname = "/";
    home.search = "";
    return NextResponse.redirect(home);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip static files and image optimisation.
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
