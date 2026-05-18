/**
 * Pure math for converting per-item assignments (one item → list of user IDs)
 * into per-user totals that include proportional tax/tip distribution.
 *
 * Mirrors the logic embedded in `assignItemsAndCreateExpense`
 * (`src/server/trpc/routers/receipts.ts`) so that both the receipt-driven
 * flow and the new group-claim-session finalization flow share the same
 * splitting math.
 */

export type ItemForSplit = {
  /** Stable identifier (receipt item id, or synthetic for claim sessions). */
  id: string;
  /** Total price of the item in cents. */
  totalPrice: number;
};

export type AssignmentForSplit = {
  /** Must match one of the item ids in `items`. */
  itemId: string;
  /** Non-empty list of user ids the item is split across. */
  userIds: string[];
};

export type ComputeUserTotalsInput = {
  items: ItemForSplit[];
  assignments: AssignmentForSplit[];
  tax: number;
  tip: number;
  /**
   * The receipt subtotal used as the denominator when proportioning tax/tip.
   * If 0 or missing, falls back to the sum of assigned item totals.
   */
  receiptSubtotal: number;
};

export type ComputeUserTotalsOutput = {
  /** Per-user item subtotal (before tax/tip). */
  userSubtotals: Map<string, number>;
  /** Per-user final amount (item subtotal + proportional tax + proportional tip). */
  userTotals: Map<string, number>;
  /** Sum of all `userTotals` — i.e. the Expense.amount. */
  totalAmount: number;
  /** Sum of all `userSubtotals` — the Expense.subtotal (excludes unassigned items). */
  actualSubtotal: number;
};

/**
 * Computes per-user totals from item assignments and tax/tip.
 *
 * Behaviour matches `assignItemsAndCreateExpense`:
 * - Each item's price is split evenly across its assigned users; integer
 *   remainder is distributed one-cent-per-user round-robin.
 * - Tax and tip are split proportionally to each user's item subtotal,
 *   relative to `receiptSubtotal` (so unassigned items still consume their
 *   tax/tip share — preserving the receipt's totals).
 * - The last user in iteration order absorbs the off-by-one remainder so
 *   the per-user totals sum exactly to `actualSubtotal + tax + tip`.
 */
export function computeUserTotalsFromClaims(input: ComputeUserTotalsInput): ComputeUserTotalsOutput {
  const itemMap = new Map(input.items.map((i) => [i.id, i] as const));

  const userSubtotals = new Map<string, number>();
  for (const assignment of input.assignments) {
    const item = itemMap.get(assignment.itemId);
    if (!item) {
      throw new Error(`Assignment references unknown itemId "${assignment.itemId}"`);
    }
    if (assignment.userIds.length === 0) {
      throw new Error(`Assignment for itemId "${assignment.itemId}" has no userIds`);
    }
    const perPerson = Math.floor(item.totalPrice / assignment.userIds.length);
    const remainder = item.totalPrice - perPerson * assignment.userIds.length;
    for (let i = 0; i < assignment.userIds.length; i++) {
      const userId = assignment.userIds[i]!;
      const amount = perPerson + (i < remainder ? 1 : 0);
      userSubtotals.set(userId, (userSubtotals.get(userId) ?? 0) + amount);
    }
  }

  const actualSubtotal = Array.from(userSubtotals.values()).reduce((a, b) => a + b, 0);
  const receiptSubtotal = input.receiptSubtotal > 0 ? input.receiptSubtotal : actualSubtotal;
  const totalAmount = actualSubtotal + input.tax + input.tip;

  const userTotals = new Map<string, number>();
  let allocatedTotal = 0;
  const userEntries = Array.from(userSubtotals.entries());

  for (let i = 0; i < userEntries.length; i++) {
    const [userId, itemTotal] = userEntries[i]!;
    if (i === userEntries.length - 1) {
      const userTotal = totalAmount - allocatedTotal;
      userTotals.set(userId, userTotal);
      allocatedTotal += userTotal;
    } else {
      const proportion = receiptSubtotal > 0 ? itemTotal / receiptSubtotal : 0;
      const userTax = Math.round(input.tax * proportion);
      const userTip = Math.round(input.tip * proportion);
      const userTotal = itemTotal + userTax + userTip;
      userTotals.set(userId, userTotal);
      allocatedTotal += userTotal;
    }
  }

  return { userSubtotals, userTotals, totalAmount, actualSubtotal };
}
