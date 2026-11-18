import { NextResponse, type NextRequest } from "next/server";

const locales = ["uk", "en"] as const;
const defaultLocale = "uk";

function pickLocale(request: NextRequest): string {
  const saved = request.cookies.get("lang")?.value;
  if (saved && (locales as readonly string[]).includes(saved)) return saved;
  // Ukrainian unless the browser clearly prefers English and not Ukrainian.
  const accept = (request.headers.get("accept-language") ?? "").toLowerCase();
  if (accept.startsWith("en") && !accept.includes("uk")) return "en";
  return defaultLocale;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasLocale = locales.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`),
  );
  if (hasLocale) return;
  request.nextUrl.pathname = `/${pickLocale(request)}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  matcher: ["/((?!_next|api|icon|.*\\..*).*)"],
};
