import { type NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  // Auth védelem — Story 2.1-ben kerül teljes implementálásra
  // Jelenleg placeholder, ami átengedi az összes kérést
  return NextResponse.next({ request });
}

export const config = {
  matcher: [
    /*
     * Illeszkedik minden kérésre kivéve:
     * - _next/static (statikus fájlok)
     * - _next/image (képek)
     * - favicon.ico
     * - képformátumok (svg, png, jpg, stb.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
