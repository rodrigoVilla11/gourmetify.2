export type Unit = "KG" | "G" | "L" | "ML" | "UNIT";
export type Currency = "ARS" | "EUR" | "USD";
export type MovementType = "SALE" | "ADJUSTMENT" | "PURCHASE";
export type PreparationMovementType = "PRODUCE" | "SALE" | "ADJUST";
export type PaymentMethod =
  | "EFECTIVO"
  | "TRANSFERENCIA"
  | "ONLINE"
  | "DEBITO"
  | "CREDITO"
  | "RAPPI"
  | "MERCADO_ENVIOS";
export type PaymentTerms = "ON_DELIVERY" | "IMMEDIATE" | "CREDIT";
export type InvoiceStatus = "PENDING" | "PARTIAL" | "PAID";

export const UNITS: Unit[] = ["KG", "G", "L", "ML", "UNIT"];
export const CURRENCIES: Currency[] = ["ARS", "EUR", "USD"];
export const MOVEMENT_TYPES: MovementType[] = ["SALE", "ADJUSTMENT", "PURCHASE"];
export const PAYMENT_METHODS: PaymentMethod[] = [
  "EFECTIVO",
  "TRANSFERENCIA",
  "ONLINE",
  "DEBITO",
  "CREDITO",
  "RAPPI",
  "MERCADO_ENVIOS",
];
export const PAYMENT_TERMS: PaymentTerms[] = ["ON_DELIVERY", "IMMEDIATE", "CREDIT"];
export const INVOICE_STATUSES: InvoiceStatus[] = ["PENDING", "PARTIAL", "PAID"];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
  ONLINE: "Online",
  DEBITO: "Débito",
  CREDITO: "Crédito",
  RAPPI: "Rappi",
  MERCADO_ENVIOS: "Mercado Envíos",
};

export const PAYMENT_TERMS_LABELS: Record<PaymentTerms, string> = {
  ON_DELIVERY: "Contra entrega",
  IMMEDIATE: "En el momento",
  CREDIT: "Cuenta corriente",
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  PENDING: "Pendiente",
  PARTIAL: "Parcial",
  PAID: "Pagada",
};
