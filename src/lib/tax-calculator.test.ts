import { describe, test, expect } from "vitest";
import { computeTax } from "./tax-calculator";

describe("computeTax", () => {
  test("zero rates: total equals subtotal", () => {
    expect(computeTax({ subtotalCents: 10000, servicePercent: 0, taxPercent: 0 })).toEqual({
      subtotalCents: 10000,
      serviceChargeCents: 0,
      taxCents: 0,
      totalCents: 10000,
    });
  });

  test("MY standard: 10% service + 6% SST on RM100", () => {
    const r = computeTax({ subtotalCents: 10000, servicePercent: 10, taxPercent: 6 });
    expect(r.serviceChargeCents).toBe(1000);
    expect(r.taxCents).toBe(660);
    expect(r.totalCents).toBe(11660);
  });

  test("MY 6% SST only on RM100", () => {
    const r = computeTax({ subtotalCents: 10000, servicePercent: 0, taxPercent: 6 });
    expect(r.serviceChargeCents).toBe(0);
    expect(r.taxCents).toBe(600);
    expect(r.totalCents).toBe(10600);
  });

  test("MY 8% alcohol SST on RM50", () => {
    const r = computeTax({ subtotalCents: 5000, servicePercent: 0, taxPercent: 8 });
    expect(r.taxCents).toBe(400);
    expect(r.totalCents).toBe(5400);
  });

  test("US tip 18% (no tax)", () => {
    const r = computeTax({ subtotalCents: 5000, servicePercent: 18, taxPercent: 0 });
    expect(r.serviceChargeCents).toBe(900);
    expect(r.taxCents).toBe(0);
    expect(r.totalCents).toBe(5900);
  });

  test("rounds to nearest cent", () => {
    // 99 * 6% = 5.94 cents → rounds to 6
    const r = computeTax({ subtotalCents: 99, servicePercent: 0, taxPercent: 6 });
    expect(r.taxCents).toBe(6);
    expect(r.totalCents).toBe(105);
  });

  test("tax compounds on (subtotal + service), not subtotal alone", () => {
    // RM100 + 10% service = RM110, then 6% of RM110 = RM6.60 (660 cents)
    // If tax were on subtotal only: 6% of RM100 = RM6.00 (600 cents)
    const r = computeTax({ subtotalCents: 10000, servicePercent: 10, taxPercent: 6 });
    expect(r.taxCents).toBe(660);
    expect(r.taxCents).not.toBe(600);
  });

  test("negative inputs are clamped to zero", () => {
    const r = computeTax({ subtotalCents: -100, servicePercent: -10, taxPercent: -6 });
    expect(r.subtotalCents).toBe(0);
    expect(r.serviceChargeCents).toBe(0);
    expect(r.taxCents).toBe(0);
    expect(r.totalCents).toBe(0);
  });

  test("zero subtotal yields zero everywhere", () => {
    const r = computeTax({ subtotalCents: 0, servicePercent: 10, taxPercent: 6 });
    expect(r.totalCents).toBe(0);
    expect(r.serviceChargeCents).toBe(0);
    expect(r.taxCents).toBe(0);
  });
});
