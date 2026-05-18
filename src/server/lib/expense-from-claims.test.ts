import { describe, expect, test } from "vitest";
import { computeUserTotalsFromClaims } from "./expense-from-claims";

describe("computeUserTotalsFromClaims", () => {
  test("single user takes whole item, no tax/tip", () => {
    const result = computeUserTotalsFromClaims({
      items: [{ id: "i1", totalPrice: 1000 }],
      assignments: [{ itemId: "i1", userIds: ["u1"] }],
      tax: 0,
      tip: 0,
      receiptSubtotal: 1000,
    });
    expect(result.userTotals.get("u1")).toBe(1000);
    expect(result.totalAmount).toBe(1000);
    expect(result.actualSubtotal).toBe(1000);
  });

  test("two users split an item evenly with no remainder", () => {
    const result = computeUserTotalsFromClaims({
      items: [{ id: "i1", totalPrice: 1000 }],
      assignments: [{ itemId: "i1", userIds: ["u1", "u2"] }],
      tax: 0,
      tip: 0,
      receiptSubtotal: 1000,
    });
    expect(result.userSubtotals.get("u1")).toBe(500);
    expect(result.userSubtotals.get("u2")).toBe(500);
  });

  test("integer-remainder is round-robined to earliest users", () => {
    const result = computeUserTotalsFromClaims({
      items: [{ id: "i1", totalPrice: 1001 }],
      assignments: [{ itemId: "i1", userIds: ["u1", "u2"] }],
      tax: 0,
      tip: 0,
      receiptSubtotal: 1001,
    });
    expect(result.userSubtotals.get("u1")).toBe(501);
    expect(result.userSubtotals.get("u2")).toBe(500);
  });

  test("tax and tip distributed proportionally; last user absorbs remainder", () => {
    // u1 → 700, u2 → 300, subtotal 1000. tax 100 + tip 50 = 150.
    // u1 proportion 0.7 → tax 70, tip 35 → total 805
    // u2 absorbs remainder → 1000 + 150 - 805 = 345
    const result = computeUserTotalsFromClaims({
      items: [
        { id: "a", totalPrice: 700 },
        { id: "b", totalPrice: 300 },
      ],
      assignments: [
        { itemId: "a", userIds: ["u1"] },
        { itemId: "b", userIds: ["u2"] },
      ],
      tax: 100,
      tip: 50,
      receiptSubtotal: 1000,
    });
    expect(result.userTotals.get("u1")).toBe(805);
    expect(result.userTotals.get("u2")).toBe(345);
    expect(result.totalAmount).toBe(1150);
    // Sanity: sum of per-user totals equals totalAmount (the last-user remainder rule guarantees this).
    expect(Array.from(result.userTotals.values()).reduce((a, b) => a + b, 0)).toBe(1150);
  });

  test("unassigned items still claim tax/tip share via receiptSubtotal denominator", () => {
    // Only one of two items assigned; receiptSubtotal counts both. u1 gets less tax than if denom were just their item.
    const result = computeUserTotalsFromClaims({
      items: [
        { id: "a", totalPrice: 600 },
        { id: "b", totalPrice: 400 },
      ],
      assignments: [{ itemId: "a", userIds: ["u1"] }],
      tax: 100,
      tip: 0,
      receiptSubtotal: 1000,
    });
    // u1 is the only user, so they end up with all of (actualSubtotal + tax + tip) = 600 + 100 = 700
    expect(result.userTotals.get("u1")).toBe(700);
    expect(result.actualSubtotal).toBe(600);
    expect(result.totalAmount).toBe(700);
  });

  test("falls back to actualSubtotal when receiptSubtotal is 0", () => {
    const result = computeUserTotalsFromClaims({
      items: [{ id: "i1", totalPrice: 500 }],
      assignments: [{ itemId: "i1", userIds: ["u1"] }],
      tax: 50,
      tip: 0,
      receiptSubtotal: 0,
    });
    expect(result.userTotals.get("u1")).toBe(550);
  });

  test("throws on unknown itemId in assignment", () => {
    expect(() =>
      computeUserTotalsFromClaims({
        items: [{ id: "a", totalPrice: 100 }],
        assignments: [{ itemId: "b", userIds: ["u1"] }],
        tax: 0,
        tip: 0,
        receiptSubtotal: 100,
      })
    ).toThrow(/unknown itemId/);
  });

  test("throws on empty userIds list", () => {
    expect(() =>
      computeUserTotalsFromClaims({
        items: [{ id: "a", totalPrice: 100 }],
        assignments: [{ itemId: "a", userIds: [] }],
        tax: 0,
        tip: 0,
        receiptSubtotal: 100,
      })
    ).toThrow(/no userIds/);
  });
});
