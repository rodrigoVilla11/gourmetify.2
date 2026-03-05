export type Plan = "FREE" | "STARTER" | "PRO";

export const PLAN_LABELS: Record<Plan, string> = {
  FREE: "Gratis",
  STARTER: "Starter",
  PRO: "Pro",
};

export const PLAN_COLORS: Record<Plan, string> = {
  FREE: "bg-gray-100 text-gray-600",
  STARTER: "bg-blue-100 text-blue-700",
  PRO: "bg-emerald-100 text-emerald-700",
};

export interface PlanFeatures {
  employees: boolean;
  clientes: boolean;
  suppliers: boolean;
  combos: boolean;
  analytics: boolean;
  financial: boolean;
  horarios: boolean;
}

export const PLAN_LIMITS: Record<Plan, { maxProducts: number | null; maxUsers: number | null; maxEmployees: number | null }> = {
  FREE:    { maxProducts: 20,   maxUsers: 2,    maxEmployees: 0    },
  STARTER: { maxProducts: 100,  maxUsers: 5,    maxEmployees: 20   },
  PRO:     { maxProducts: null, maxUsers: null, maxEmployees: null },
};

export const PLAN_FEATURES: Record<Plan, PlanFeatures> = {
  FREE: {
    employees: false,
    clientes: false,
    suppliers: false,
    combos: false,
    analytics: false,
    financial: false,
    horarios: false,
  },
  STARTER: {
    employees: true,
    clientes: true,
    suppliers: true,
    combos: true,
    analytics: true,
    financial: true,
    horarios: false,
  },
  PRO: {
    employees: true,
    clientes: true,
    suppliers: true,
    combos: true,
    analytics: true,
    financial: true,
    horarios: true,
  },
};

/** Returns the plan if valid, or "FREE" if expired. */
export function effectivePlan(plan: Plan, expiresAt: string | Date | null | undefined): Plan {
  if (!expiresAt) return plan;
  return new Date() < new Date(expiresAt as string) ? plan : "FREE";
}

/** Returns the minimum plan name that enables a feature. */
export function minPlanFor(feature: keyof PlanFeatures): string {
  if (PLAN_FEATURES.STARTER[feature]) return "Starter";
  return "Pro";
}
