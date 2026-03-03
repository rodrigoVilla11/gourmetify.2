import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "fallback-dev-secret-change-in-prod"
);
const COOKIE_NAME = "sq_token";

// Prefixes that require no authentication
const PUBLIC_PREFIXES = ["/login", "/setup", "/api/auth/"];

// Page-level access for restricted roles (CAJERA and EMPLEADO)
// ADMIN and ENCARGADO bypass these checks entirely
const CAJERA_PAGE_PREFIXES = [
  "/fichador",
  "/caja-diaria",
  "/facturas-proveedores",
];

const EMPLEADO_PAGE_PREFIXES = ["/fichador"];

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const isApiRoute = pathname.startsWith("/api/");

  let session: { role: string } | null = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, SECRET);
      session = payload as { role: string };
    } catch {
      session = null;
    }
  }

  // Not authenticated
  if (!session) {
    if (isApiRoute) {
      return NextResponse.json({ error: "No autenticado", code: "UNAUTHORIZED" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = session.role;

  // ADMIN and ENCARGADO: full access
  if (role === "ADMIN" || role === "ENCARGADO") {
    return NextResponse.next();
  }

  // API routes: only check authentication (done above), skip role-based page restrictions
  if (isApiRoute) {
    return NextResponse.next();
  }

  // CAJERA: allow only specific page prefixes
  if (role === "CAJERA") {
    const allowed = CAJERA_PAGE_PREFIXES.some((p) => pathname.startsWith(p));
    if (!allowed) {
      return NextResponse.redirect(new URL("/caja-diaria", req.url));
    }
    return NextResponse.next();
  }

  // EMPLEADO: only fichador
  if (role === "EMPLEADO") {
    const allowed = EMPLEADO_PAGE_PREFIXES.some((p) => pathname.startsWith(p));
    if (!allowed) {
      return NextResponse.redirect(new URL("/fichador", req.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}
