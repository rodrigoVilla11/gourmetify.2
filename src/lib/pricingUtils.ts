// Pure pricing utilities — safe to use on client and server.

export type DiscountConfig = {
  id: string;
  name: string;
  label?: string | null;
  discountType: string;
  value: number;
  priority: number;
  isActive: boolean;
  dateFrom?: string | null;
  dateTo?: string | null;
  timeFrom?: string | null;
  timeTo?: string | null;
  weekdays?: number[] | null;
  appliesTo: string;
  productIds?: string[] | null;
  categoryIds?: string[] | null;
  paymentMethods?: string[] | null;
};

export type DiscountContext = {
  now: Date;
  paymentMethod?: string;
  productIds?: string[];
  categoryIds?: string[];
};

/** Returns true if all conditions for the discount are met. */
export function isDiscountApplicable(d: DiscountConfig, ctx: DiscountContext): boolean {
  if (!d.isActive) return false;

  // Date range
  if (d.dateFrom || d.dateTo) {
    const today = ctx.now.toISOString().slice(0, 10); // "YYYY-MM-DD"
    if (d.dateFrom && today < d.dateFrom) return false;
    if (d.dateTo   && today > d.dateTo)   return false;
  }

  // Time range (HH:MM strings)
  if (d.timeFrom || d.timeTo) {
    const hhmm = ctx.now.toTimeString().slice(0, 5);
    if (d.timeFrom && hhmm < d.timeFrom) return false;
    if (d.timeTo   && hhmm > d.timeTo)   return false;
  }

  // Weekdays (0=Sun … 6=Sat)
  if (d.weekdays && Array.isArray(d.weekdays) && d.weekdays.length > 0) {
    if (!d.weekdays.includes(ctx.now.getDay())) return false;
  }

  // Payment method restriction
  if (d.paymentMethods && Array.isArray(d.paymentMethods) && d.paymentMethods.length > 0) {
    if (!ctx.paymentMethod || !d.paymentMethods.includes(ctx.paymentMethod)) return false;
  }

  // Scope restriction
  if (d.appliesTo === "PRODUCTS") {
    if (!d.productIds || d.productIds.length === 0) return false;
    if (!ctx.productIds || !ctx.productIds.some((id) => d.productIds!.includes(id))) return false;
  }
  if (d.appliesTo === "CATEGORIES") {
    if (!d.categoryIds || d.categoryIds.length === 0) return false;
    if (!ctx.categoryIds || !ctx.categoryIds.some((id) => d.categoryIds!.includes(id))) return false;
  }

  return true;
}

/** Returns the single best applicable discount and its computed amount, or null. */
export function findBestDiscount(
  discounts: DiscountConfig[],
  subtotal: number,
  ctx: DiscountContext,
): { discount: DiscountConfig; amount: number } | null {
  let best: { discount: DiscountConfig; amount: number } | null = null;

  for (const d of discounts) {
    if (!isDiscountApplicable(d, ctx)) continue;
    const amount =
      d.discountType === "PERCENTAGE"
        ? subtotal * (d.value / 100)
        : Math.min(d.value, subtotal);
    if (!best || amount > best.amount) {
      best = { discount: d, amount };
    }
  }

  return best;
}

/** Full order pricing computation following the canonical order. */
export function computeOrderPricing(params: {
  itemsSubtotal: number;
  deliveryFee: number;
  extras: { price: number; quantity: number; isFree: boolean }[];
  discounts: DiscountConfig[];
  discountCtx: DiscountContext;
  paymentAdjustmentAmount: number;
}): {
  itemsSubtotal: number;
  extrasAmount: number;
  discountAmount: number;
  paymentAdjustmentAmount: number;
  deliveryFee: number;
  total: number;
  appliedDiscount: DiscountConfig | null;
} {
  const { itemsSubtotal, deliveryFee, extras, discounts, discountCtx, paymentAdjustmentAmount } = params;

  const extrasAmount = extras.reduce(
    (sum, e) => sum + (e.isFree ? 0 : e.price * e.quantity),
    0,
  );

  const subtotalForDiscount = itemsSubtotal + deliveryFee + extrasAmount;
  const bestDiscount = findBestDiscount(discounts, subtotalForDiscount, discountCtx);
  const discountAmount = bestDiscount?.amount ?? 0;

  // Prevent negative totals (discount + negative adjustment can't exceed subtotal)
  const total = Math.max(0, subtotalForDiscount - discountAmount + paymentAdjustmentAmount);

  return {
    itemsSubtotal,
    extrasAmount,
    discountAmount,
    paymentAdjustmentAmount,
    deliveryFee,
    total,
    appliedDiscount: bestDiscount?.discount ?? null,
  };
}
