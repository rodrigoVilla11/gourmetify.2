import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "fallback-dev-secret-change-in-prod"
);
const COOKIE_NAME = "sq_token";

// Prefixes that require no authentication
const PUBLIC_PREFIXES = ["/login", "/setup", "/api/auth/", "/menu", "/api/public/"];

// Page-level access for restricted roles (CAJERA and EMPLEADO)
const CAJERA_PAGE_PREFIXES = [
  "/fichador",
  "/caja-diaria",
  "/facturas-proveedores",
  "/comandas",
  "/sales",
  "/cocina",
  "/repartidores",
];

const EMPLEADO_PAGE_PREFIXES = ["/fichador", "/cocina"];

// Pages NOT accessible to SUPERADMIN (they manage orgs, not business data)
const BUSINESS_PAGE_PREFIXES = [
  "/sales", "/comandas", "/products", "/ingredients", "/suppliers",
  "/employees", "/fichador", "/caja", "/gastos", "/resultados",
  "/analytics", "/clientes", "/horarios", "/preparaciones", "/combos",
];

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

  let session: { role: string; organizationId?: string | null; plan?: string; planExpiresAt?: string | null } | null = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, SECRET);
      session = payload as { role: string; organizationId?: string | null; plan?: string; planExpiresAt?: string | null };
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
  const organizationId = session.organizationId ?? null;

  // ── SUPERADMIN ─────────────────────────────────────────────────────────────
  if (role === "SUPERADMIN") {
    if (isApiRoute) return NextResponse.next();
    // Redirect to admin panel for any non-admin page
    if (!pathname.startsWith("/admin/")) {
      return NextResponse.redirect(new URL("/admin/organizations", req.url));
    }
    return NextResponse.next();
  }

  // ── All other roles: forward organizationId + plan + role as headers
  const requestHeaders = new Headers(req.headers);
  if (organizationId) {
    requestHeaders.set("x-organization-id", organizationId);
  }
  // Propagate effective plan (FREE if expired)
  const rawPlan = session.plan ?? "FREE";
  const expiresAt = session.planExpiresAt;
  const effectivePlan = !expiresAt || new Date() < new Date(expiresAt) ? rawPlan : "FREE";
  requestHeaders.set("x-org-plan", effectivePlan);
  // Forward role so API routes can enforce RBAC without re-reading the JWT
  requestHeaders.set("x-user-role", role);

  // ── ADMIN: full access within their org ───────────────────────────────────
  if (role === "ADMIN") {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // ── ENCARGADO: full access (manager — sees financial/analytics pages) ──────
  // Must come BEFORE any prefix blocking so ENCARGADO is not locked out of
  // /resultados, /gastos, /analytics, /caja that they legitimately need.
  if (role === "ENCARGADO") {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // API routes for CAJERA/EMPLEADO: pass through — each API enforces its own RBAC
  if (isApiRoute) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // ── CAJERA: allow only specific page prefixes ──────────────────────────────
  // /gastos, /analytics, /resultados, /caja are implicitly blocked (not in list)
  if (role === "CAJERA") {
    const allowed = CAJERA_PAGE_PREFIXES.some((p) => pathname.startsWith(p));
    if (!allowed) {
      return NextResponse.redirect(new URL("/comandas", req.url));
    }
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // ── EMPLEADO: only fichador ────────────────────────────────────────────────
  if (role === "EMPLEADO") {
    const allowed = EMPLEADO_PAGE_PREFIXES.some((p) => pathname.startsWith(p));
    if (!allowed) {
      return NextResponse.redirect(new URL("/fichador", req.url));
    }
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}
