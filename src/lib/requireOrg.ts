import { NextRequest, NextResponse } from "next/server";
import { PLAN_FEATURES, PLAN_LIMITS, type Plan, type PlanFeatures } from "./plans";
import { prisma } from "./prisma";

/**
 * Extracts the organizationId from the x-organization-id header
 * set by middleware after JWT verification.
 * Returns the orgId or throws a NextResponse 401.
 */
export function requireOrg(req: NextRequest): string {
  const orgId = req.headers.get("x-organization-id");
  if (!orgId) {
    throw NextResponse.json(
      { error: "No autenticado", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }
  return orgId;
}

/** Reads x-org-plan from header, returns effective plan. */
export function getOrgPlan(req: NextRequest): Plan {
  return (req.headers.get("x-org-plan") ?? "FREE") as Plan;
}

/**
 * Checks whether the org's plan includes a given feature.
 * Throws 403 NextResponse if the feature is locked.
 */
export function requireFeature(req: NextRequest, feature: keyof PlanFeatures): void {
  const plan = getOrgPlan(req);
  if (!PLAN_FEATURES[plan][feature]) {
    throw NextResponse.json(
      { error: "Tu plan no incluye esta funcionalidad. Actualizá tu plan para acceder.", code: "PLAN_LIMIT" },
      { status: 403 }
    );
  }
}

/**
 * Checks a numeric resource limit.
 * Throws 403 NextResponse if current count >= plan limit.
 */
export async function checkLimit(
  orgId: string,
  resource: "products" | "users" | "employees",
  req: NextRequest
): Promise<void> {
  const plan = getOrgPlan(req);
  const limitKey = resource === "products" ? "maxProducts" : resource === "users" ? "maxUsers" : "maxEmployees";
  const max = PLAN_LIMITS[plan][limitKey];
  if (max === null) return; // unlimited

  const count =
    resource === "products"
      ? await prisma.product.count({ where: { organizationId: orgId, isActive: true } })
      : resource === "users"
      ? await prisma.user.count({ where: { organizationId: orgId, isActive: true } })
      : await prisma.employee.count({ where: { organizationId: orgId, isActive: true } });

  if (count >= max) {
    throw NextResponse.json(
      { error: `Tu plan permite un máximo de ${max} ${resource}. Actualizá tu plan para agregar más.`, code: "PLAN_LIMIT" },
      { status: 403 }
    );
  }
}
