import { describe, it, expect } from "vitest";
import { receiptExtractionSchema } from "./schema";

const BASE_ITEM = { name: "Item", quantity: 1, unitPrice: 100, totalPrice: 100 };

describe("receiptExtractionSchema", () => {
  it("parses a minimal tax-exclusive receipt and applies defaults for new fields", () => {
    const parsed = receiptExtractionSchema.parse({
      items: [BASE_ITEM],
      subtotal: 100,
      total: 108,
      tax: 8,
    });

    expect(parsed.serviceCharge).toBe(0);
    expect(parsed.discount).toBe(0);
    expect(parsed.pricesIncludeTax).toBe(false);
    expect(parsed.taxPct).toBeUndefined();
    expect(parsed.servicePct).toBeUndefined();
    expect(parsed.currency).toBe("USD");
  });

  it("parses a Malaysian receipt with SST, service charge, and printed percentages", () => {
    const parsed = receiptExtractionSchema.parse({
      merchantName: "Nasi Lemak Antarabangsa",
      items: [
        { name: "Nasi Lemak Ayam", quantity: 1, unitPrice: 1200, totalPrice: 1200 },
        { name: "Teh Tarik", quantity: 2, unitPrice: 350, totalPrice: 700 },
      ],
      subtotal: 1900,
      serviceCharge: 190,
      tax: 125,
      servicePct: 10,
      taxPct: 6,
      pricesIncludeTax: false,
      total: 2215,
      currency: "MYR",
    });

    expect(parsed.serviceCharge).toBe(190);
    expect(parsed.tax).toBe(125);
    expect(parsed.servicePct).toBe(10);
    expect(parsed.taxPct).toBe(6);
    expect(parsed.pricesIncludeTax).toBe(false);
    expect(parsed.currency).toBe("MYR");
  });

  it("parses a tax-inclusive receipt (e.g. Singapore 'prices include GST')", () => {
    const parsed = receiptExtractionSchema.parse({
      items: [{ name: "Set Lunch", quantity: 1, unitPrice: 2000, totalPrice: 2000 }],
      subtotal: 2000,
      tax: 162, // informational — already baked in
      taxPct: 9,
      pricesIncludeTax: true,
      total: 2000,
      currency: "SGD",
    });

    expect(parsed.pricesIncludeTax).toBe(true);
    expect(parsed.tax).toBe(162);
    expect(parsed.total).toBe(parsed.subtotal); // tax was inside subtotal
  });

  it("parses a receipt with a discount", () => {
    const parsed = receiptExtractionSchema.parse({
      items: [{ name: "Set Lunch", quantity: 1, unitPrice: 2200, totalPrice: 2200 }],
      subtotal: 2200,
      discount: 500,
      tax: 102,
      taxPct: 6,
      total: 1802,
      currency: "MYR",
    });

    expect(parsed.discount).toBe(500);
  });

  it("accepts taxPct=null as explicit absence of a printed percentage", () => {
    const parsed = receiptExtractionSchema.parse({
      items: [BASE_ITEM],
      subtotal: 100,
      total: 100,
      taxPct: null,
      servicePct: null,
    });

    expect(parsed.taxPct).toBeNull();
    expect(parsed.servicePct).toBeNull();
  });

  it("rejects discounts expressed as negative numbers (must be positive)", () => {
    expect(() =>
      receiptExtractionSchema.parse({
        items: [BASE_ITEM],
        subtotal: 100,
        discount: -500,
        total: -400,
      }),
    ).toThrow();
  });

  it("rejects percentages outside 0-100", () => {
    expect(() =>
      receiptExtractionSchema.parse({
        items: [BASE_ITEM],
        subtotal: 100,
        total: 100,
        taxPct: 150,
      }),
    ).toThrow();
  });

  it("is backward compatible — existing extraction without new fields still parses", () => {
    // Receipts cached in DB from before this change should not break re-parsing.
    const legacy = {
      merchantName: "Legacy Diner",
      items: [BASE_ITEM],
      subtotal: 100,
      tax: 8,
      tip: 0,
      total: 108,
      currency: "USD",
    };

    expect(() => receiptExtractionSchema.parse(legacy)).not.toThrow();
  });

  // ─── rounding (MY 5-sen rounding) ─────────────────────

  it("parses an MY receipt with a negative rounding adjustment", () => {
    const parsed = receiptExtractionSchema.parse({
      items: [{ name: "Roti Canai", quantity: 1, unitPrice: 320, totalPrice: 320 }],
      subtotal: 320,
      tax: 19, // 6% of 320 = 19.2 → printed as 19
      taxPct: 6,
      rounding: -4, // 339 -> 335 (rounds down 4 sen to nearest 5)
      total: 335,
      currency: "MYR",
    });

    expect(parsed.rounding).toBe(-4);
    expect(parsed.total).toBe(335);
  });

  it("accepts positive rounding (rare — round-up adjustment)", () => {
    const parsed = receiptExtractionSchema.parse({
      items: [BASE_ITEM],
      subtotal: 100,
      total: 110,
      tax: 9,
      rounding: 1,
    });

    expect(parsed.rounding).toBe(1);
  });

  it("defaults rounding to 0 when not provided", () => {
    const parsed = receiptExtractionSchema.parse({
      items: [BASE_ITEM],
      subtotal: 100,
      total: 100,
    });

    expect(parsed.rounding).toBe(0);
  });

  // ─── originalName (multilingual / code-prefix) ─────────

  it("parses an item with a Chinese originalName", () => {
    const parsed = receiptExtractionSchema.parse({
      items: [
        { name: "Mapo Tofu", originalName: "麻婆豆腐", quantity: 1, unitPrice: 1880, totalPrice: 1880 },
      ],
      subtotal: 1880,
      total: 1880,
    });

    expect(parsed.items[0].originalName).toBe("麻婆豆腐");
    expect(parsed.items[0].name).toBe("Mapo Tofu");
  });

  it("parses an item with a code-prefix originalName", () => {
    const parsed = receiptExtractionSchema.parse({
      items: [
        { name: "Dumpling+Mixed Vegetable", originalName: "PK001 Dumpling+Mixed Vegetable", quantity: 2, unitPrice: 1390, totalPrice: 2780 },
      ],
      subtotal: 2780,
      total: 2780,
    });

    expect(parsed.items[0].originalName).toBe("PK001 Dumpling+Mixed Vegetable");
    expect(parsed.items[0].quantity).toBe(2);
    expect(parsed.items[0].unitPrice).toBe(1390);
    expect(parsed.items[0].totalPrice).toBe(2780);
  });

  it("accepts originalName as null (clean English item)", () => {
    const parsed = receiptExtractionSchema.parse({
      items: [{ name: "Grilled Salmon", originalName: null, quantity: 1, unitPrice: 1895, totalPrice: 1895 }],
      subtotal: 1895,
      total: 1895,
    });

    expect(parsed.items[0].originalName).toBeNull();
  });

  it("accepts items without an originalName field (backward compat)", () => {
    const parsed = receiptExtractionSchema.parse({
      items: [BASE_ITEM],
      subtotal: 100,
      total: 100,
    });

    expect(parsed.items[0].originalName).toBeUndefined();
  });

  // ─── multi-quantity invariant ─────────────────────────

  it("parses a multi-qty line like '2 PK001 Dumpling+Mixed Vegetable 27.80' with qty*unitPrice=totalPrice", () => {
    const parsed = receiptExtractionSchema.parse({
      items: [
        { name: "Dumpling+Mixed Vegetable", quantity: 2, unitPrice: 1390, totalPrice: 2780 },
      ],
      subtotal: 2780,
      total: 2780,
    });

    const item = parsed.items[0];
    expect(item.quantity).toBe(2);
    expect(item.unitPrice * item.quantity).toBe(item.totalPrice);
  });
});
