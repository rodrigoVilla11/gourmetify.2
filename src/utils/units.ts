import type { Unit } from "@/types";

type UnitFamily = "MASS" | "VOLUME" | "COUNT";

// Conversion factors to canonical base unit (G for mass, ML for volume)
const TO_BASE: Record<Unit, number> = {
  G: 1,
  KG: 1000,
  ML: 1,
  L: 1000,
  UNIT: 1,
};

const UNIT_FAMILY: Record<Unit, UnitFamily> = {
  G: "MASS",
  KG: "MASS",
  ML: "VOLUME",
  L: "VOLUME",
  UNIT: "COUNT",
};

/**
 * Convert a quantity from `fromUnit` to `toUnit`.
 * Throws if units are from different families (e.g. KG -> ML).
 * For UNIT -> UNIT, returns value unchanged.
 */
export function convertUnit(qty: number, fromUnit: Unit, toUnit: Unit): number {
  if (fromUnit === toUnit) return qty;
  if (UNIT_FAMILY[fromUnit] !== UNIT_FAMILY[toUnit]) {
    throw new Error(`Incompatible units: cannot convert ${fromUnit} to ${toUnit}`);
  }
  const inBase = qty * TO_BASE[fromUnit];
  return inBase / TO_BASE[toUnit];
}

/** Human-readable unit label */
export function unitLabel(unit: Unit): string {
  const labels: Record<Unit, string> = {
    KG: "kg",
    G: "g",
    L: "L",
    ML: "mL",
    UNIT: "ud",
  };
  return labels[unit];
}

/** Returns all units from the same family as the given unit */
export function compatibleUnits(unit: Unit): Unit[] {
  const family = UNIT_FAMILY[unit];
  return (Object.entries(UNIT_FAMILY) as [Unit, UnitFamily][])
    .filter(([, f]) => f === family)
    .map(([u]) => u);
}

/** Format a quantity with its unit label */
export function formatQty(qty: number | string, unit: Unit): string {
  const value = typeof qty === "string" ? parseFloat(qty) : qty;
  return `${value.toLocaleString("es-AR", { maximumFractionDigits: 3 })} ${unitLabel(unit)}`;
}

export { UNIT_FAMILY };
