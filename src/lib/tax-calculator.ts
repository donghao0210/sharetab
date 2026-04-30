export type TaxBreakdown = {
  subtotalCents: number;
  serviceChargeCents: number;
  taxCents: number;
  totalCents: number;
};

/**
 * Compute tax/service breakdown for an expense.
 *
 * Order (Malaysian convention, also valid for US tip-on-pretax + tax-on-pretax):
 *   1. service charge = subtotal * (servicePercent / 100)
 *   2. tax            = (subtotal + service) * (taxPercent / 100)
 *   3. total          = subtotal + service + tax
 *
 * Each component is rounded to the nearest cent independently.
 */
export function computeTax(params: {
  subtotalCents: number;
  servicePercent: number;
  taxPercent: number;
}): TaxBreakdown {
  const subtotalCents = Math.max(0, Math.round(params.subtotalCents));
  const servicePercent = Math.max(0, params.servicePercent);
  const taxPercent = Math.max(0, params.taxPercent);

  const serviceChargeCents = Math.round((subtotalCents * servicePercent) / 100);
  const taxCents = Math.round(((subtotalCents + serviceChargeCents) * taxPercent) / 100);
  const totalCents = subtotalCents + serviceChargeCents + taxCents;

  return { subtotalCents, serviceChargeCents, taxCents, totalCents };
}
