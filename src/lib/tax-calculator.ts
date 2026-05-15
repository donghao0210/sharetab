export type TaxBreakdown = {
  subtotalCents: number;
  discountCents: number;
  serviceChargeCents: number;
  taxCents: number;
  totalCents: number;
};

/**
 * Compute tax / service / discount breakdown for an expense.
 *
 * Order (Malaysian convention, also valid for US tip-on-pretax + tax-on-pretax):
 *   1. discounted subtotal = subtotal - discount
 *   2. service charge      = discounted subtotal * (servicePercent / 100)
 *   3. tax                 = (discounted subtotal + service) * (taxPercent / 100)
 *   4. total               = discounted subtotal + service + tax
 *
 * Each component is rounded to the nearest cent independently. Discount is
 * clamped to the subtotal so the discounted subtotal is never negative.
 */
export function computeTax(params: {
  subtotalCents: number;
  discountCents?: number;
  servicePercent: number;
  taxPercent: number;
}): TaxBreakdown {
  const subtotalCents = Math.max(0, Math.round(params.subtotalCents));
  const requestedDiscount = Math.max(0, Math.round(params.discountCents ?? 0));
  const discountCents = Math.min(subtotalCents, requestedDiscount);
  const servicePercent = Math.max(0, params.servicePercent);
  const taxPercent = Math.max(0, params.taxPercent);

  const discountedSubtotal = subtotalCents - discountCents;
  const serviceChargeCents = Math.round((discountedSubtotal * servicePercent) / 100);
  const taxCents = Math.round(((discountedSubtotal + serviceChargeCents) * taxPercent) / 100);
  const totalCents = discountedSubtotal + serviceChargeCents + taxCents;

  return { subtotalCents, discountCents, serviceChargeCents, taxCents, totalCents };
}
