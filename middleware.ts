import { NextResponse, type NextRequest } from "next/server";

/**
 * Two front doors, one app:
 * - ADMIN_HOST (e.g. myclipfarmadmin.com) serves only the admin portal (/admin, /api/admin).
 * - Every other host serves the clipper/streamer app and 404s anything under /admin.
 * With ADMIN_HOST unset (local dev) both live on the same host, as before.
 */
const ADMIN_HOST = (process.env.ADMIN_HOST || "").toLowerCase();

const isAdminPath = (p: string) =>
  p === "/admin" || p.startsWith("/admin/") || p === "/api/admin" || p.startsWith("/api/admin/");

export function middleware(req: NextRequest) {
  const host = (req.headers.get("x-forwarded-host") || req.headers.get("host") || "").split(":")[0].toLowerCase();
  const { pathname } = req.nextUrl;

  // www.example.com → example.com
  if (host.startsWith("www.")) {
    const url = req.nextUrl.clone();
    url.host = host.slice(4);
    url.port = "";
    url.protocol = "https";
    return NextResponse.redirect(url, 308);
  }

  if (!ADMIN_HOST) return NextResponse.next();

  if (host === ADMIN_HOST) {
    if (isAdminPath(pathname)) {
      const res = NextResponse.next();
      res.headers.set("X-Robots-Tag", "noindex, nofollow");
      return res;
    }
    const url = req.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    url.host = host;
    url.port = "";
    if (process.env.NODE_ENV === "production") url.protocol = "https";
    return NextResponse.redirect(url);
  }

  if (isAdminPath(pathname)) return new NextResponse("Not found", { status: 404 });
  return NextResponse.next();
}

export const config = {
  // Skip Next internals and static files (anything with a file extension).
  matcher: ["/((?!_next/|favicon.ico|.*\\.[a-zA-Z0-9]+$).*)"],
};
