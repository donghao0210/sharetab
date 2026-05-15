import { describe, test, expect } from "vitest";
import { computeTax } from "./tax-calculator";

describe("computeTax", () => {
  test("zero rates: total equals subtotal", () => {
    expect(computeTax({ subtotalCents: 10000, servicePercent: 0, taxPercent: 0 })).toEqual({
      subtotalCents: 10000,
      discountCents: 0,
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
    expect(r.discountCents).toBe(0);
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

  // ─── discount tests ───────────────────────────────────────

  test("discount reduces the base for both service and tax (MY order)", () => {
    // RM100 subtotal - RM10 discount = RM90 base
    // + 10% service on RM90 = RM9.00
    // + 6% tax on RM99 = RM5.94 → 594 cents
    // total = 9000 + 900 + 594 = 10494
    const r = computeTax({
      subtotalCents: 10000,
      discountCents: 1000,
      servicePercent: 10,
      taxPercent: 6,
    });
    expect(r.discountCents).toBe(1000);
    expect(r.serviceChargeCents).toBe(900);
    expect(r.taxCents).toBe(594);
    expect(r.totalCents).toBe(10494);
  });

  test("discount with no service or tax just subtracts from subtotal", () => {
    const r = computeTax({
      subtotalCents: 5000,
      discountCents: 500,
      servicePercent: 0,
      taxPercent: 0,
    });
    expect(r.discountCents).toBe(500);
    expect(r.totalCents).toBe(4500);
  });

  test("discount larger than subtotal is clamped to subtotal", () => {
    const r = computeTax({
      subtotalCents: 1000,
      discountCents: 5000,
      servicePercent: 10,
      taxPercent: 6,
    });
    expect(r.discountCents).toBe(1000); // clamped
    expect(r.totalCents).toBe(0); // everything zeroed out
  });

  test("negative discount is clamped to zero", () => {
    const r = computeTax({
      subtotalCents: 10000,
      discountCents: -500,
      servicePercent: 0,
      taxPercent: 0,
    });
    expect(r.discountCents).toBe(0);
    expect(r.totalCents).toBe(10000);
  });

  test("omitting discountCents is equivalent to passing 0", () => {
    const a = computeTax({ subtotalCents: 10000, servicePercent: 10, taxPercent: 6 });
    const b = computeTax({ subtotalCents: 10000, discountCents: 0, servicePercent: 10, taxPercent: 6 });
    expect(a).toEqual(b);
  });
});
