"use client";

import { use, useState, useEffect, useMemo } from "react";
import { useLocale } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { trpc } from "@/lib/trpc";
import { formatCents, parseToCents, centsToDecimal } from "@/lib/money";
import { computeTax } from "@/lib/tax-calculator";
import { getTaxPresets } from "@/lib/tax-presets";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { EqualSplit } from "@/components/expenses/equal-split";
import { ExactSplit } from "@/components/expenses/exact-split";
import { PercentageSplit } from "@/components/expenses/percentage-split";
import { SharesSplit } from "@/components/expenses/shares-split";

type SplitMode = "EQUAL" | "EXACT" | "PERCENTAGE" | "SHARES";

type MemberInfo = {
  id: string;
  name: string | null;
};

type ShareEntry = {
  userId: string;
  amount: number;
  shares?: number;
  percentage?: number;
};

const SPLIT_MODES: { value: SplitMode; label: string; description: string }[] = [
  { value: "EQUAL", label: "Equal", description: "Split evenly among selected members" },
  { value: "EXACT", label: "Exact", description: "Enter each person's share" },
  { value: "PERCENTAGE", label: "Percentage", description: "Split by percentage" },
  { value: "SHARES", label: "Shares", description: "Split by share units" },
];

export default function EditExpensePage({
  params,
}: {
  params: Promise<{ groupId: string; expenseId: string }>;
}) {
  const { groupId, expenseId } = use(params);
  const router = useRouter();
  const locale = useLocale();
  const group = trpc.groups.get.useQuery({ groupId });
  const expense = trpc.expenses.get.useQuery({ groupId, expenseId });

  const [title, setTitle] = useState("");
  const [subtotalStr, setSubtotalStr] = useState("");
  const [servicePercentStr, setServicePercentStr] = useState("0");
  const [taxPercentStr, setTaxPercentStr] = useState("0");
  const [receiptTotalStr, setReceiptTotalStr] = useState("");
  const [category, setCategory] = useState("");
  const [paidById, setPaidById] = useState("");
  const [splitMode, setSplitMode] = useState<SplitMode>("EQUAL");
  const [shares, setShares] = useState<ShareEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Pre-fill form with existing expense data
  useEffect(() => {
    if (expense.data && !loaded) {
      const e = expense.data;
      setTitle(e.title);

      const subtotalCents = e.subtotal ?? e.amount;
      const serviceChargeCents = e.serviceCharge ?? 0;
      const taxCents = e.tax ?? 0;
      const roundingCents = e.rounding ?? 0;
      setSubtotalStr(centsToDecimal(subtotalCents));
      setServicePercentStr(
        subtotalCents > 0 && serviceChargeCents > 0
          ? ((serviceChargeCents / subtotalCents) * 100).toFixed(2).replace(/\.?0+$/, "")
          : "0"
      );
      const taxBase = subtotalCents + serviceChargeCents;
      setTaxPercentStr(
        taxBase > 0 && taxCents > 0
          ? ((taxCents / taxBase) * 100).toFixed(2).replace(/\.?0+$/, "")
          : "0"
      );
      if (roundingCents !== 0) {
        setReceiptTotalStr(centsToDecimal(e.amount));
      }

      setCategory(e.category ?? "");
      setPaidById(e.paidById);
      if (e.splitMode !== "ITEM") {
        setSplitMode(e.splitMode as SplitMode);
      }
      setLoaded(true);
    }
  }, [expense.data, loaded]);

  const updateExpense = trpc.expenses.update.useMutation({
    onSuccess: () => {
      router.push(`/groups/${groupId}/expenses/${expenseId}`);
    },
  });

  const members: MemberInfo[] =
    group.data?.members.map((m) => ({
      id: m.user.id,
      name: m.user.placeholderName ?? m.user.name ?? m.user.email,
    })) ?? [];

  const groupCurrency = group.data?.currency ?? expense.data?.currency ?? "USD";
  const presets = useMemo(() => getTaxPresets(groupCurrency), [groupCurrency]);
  const hasBreakdown = useMemo(
    () => parseFloat(servicePercentStr || "0") > 0 || parseFloat(taxPercentStr || "0") > 0,
    [servicePercentStr, taxPercentStr]
  );

  const breakdown = useMemo(
    () =>
      computeTax({
        subtotalCents: parseToCents(subtotalStr),
        servicePercent: parseFloat(servicePercentStr || "0") || 0,
        taxPercent: parseFloat(taxPercentStr || "0") || 0,
      }),
    [subtotalStr, servicePercentStr, taxPercentStr]
  );
  const receiptTotalCents = parseToCents(receiptTotalStr);
  const useReceiptTotal = receiptTotalStr.trim() !== "" && receiptTotalCents > 0;
  const roundingCents = useReceiptTotal ? receiptTotalCents - breakdown.totalCents : 0;
  const amountCents = useReceiptTotal ? receiptTotalCents : breakdown.totalCents;

  function applyPreset(servicePercent: number, taxPercent: number) {
    setServicePercentStr(String(servicePercent));
    setTaxPercentStr(String(taxPercent));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!paidById || amountCents <= 0 || shares.length === 0) return;

    updateExpense.mutate({
      groupId,
      expenseId,
      title,
      amount: amountCents,
      subtotal: hasBreakdown ? breakdown.subtotalCents : null,
      serviceCharge: hasBreakdown ? breakdown.serviceChargeCents : null,
      tax: hasBreakdown ? breakdown.taxCents : null,
      rounding: hasBreakdown && roundingCents !== 0 ? roundingCents : null,
      category: category || undefined,
      paidById,
      splitMode,
      shares,
    });
  }

  if (expense.isLoading || group.isLoading) {
    return <p className="text-muted-foreground">Loading...</p>;
  }
  if (!expense.data) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <ArrowLeft className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h2 className="mb-2 text-lg font-semibold">Expense not found</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          This expense doesn&apos;t exist or has been deleted.
        </p>
        <Button nativeButton={false} render={<Link href={`/groups/${groupId}`} />}>
          Back to Group
        </Button>
      </div>
    );
  }

  const isItemSplit = expense.data.splitMode === "ITEM";

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" nativeButton={false} render={<Link href={`/groups/${groupId}/expenses/${expenseId}`} />}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Edit Expense</h1>
      </div>

      {isItemSplit && (
        <Card className="border-amber-300">
          <CardContent className="py-4 text-sm text-amber-700">
            This expense was created from a receipt scan (ITEM split). Editing will
            convert it to a standard split mode.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Expense details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Description</Label>
              <Input
                id="title"
                placeholder="e.g., Dinner, Groceries, Uber"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subtotal">Subtotal</Label>
              <Input
                id="subtotal"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={subtotalStr}
                onChange={(e) => setSubtotalStr(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">Pre-tax/service amount</p>
            </div>

            <div className="space-y-2">
              <Label>Quick presets</Label>
              <div className="flex flex-wrap gap-2">
                {presets.map((p) => {
                  const active =
                    parseFloat(servicePercentStr || "0") === p.servicePercent &&
                    parseFloat(taxPercentStr || "0") === p.taxPercent;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => applyPreset(p.servicePercent, p.taxPercent)}
                      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="servicePercent">Service / Tip %</Label>
                <Input
                  id="servicePercent"
                  type="number"
                  step="0.1"
                  min="0"
                  value={servicePercentStr}
                  onChange={(e) => setServicePercentStr(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxPercent">Tax %</Label>
                <Input
                  id="taxPercent"
                  type="number"
                  step="0.1"
                  min="0"
                  value={taxPercentStr}
                  onChange={(e) => setTaxPercentStr(e.target.value)}
                />
              </div>
            </div>

            {hasBreakdown && breakdown.subtotalCents > 0 && (
              <div className="space-y-2">
                <Label htmlFor="receiptTotal">Receipt total (optional)</Label>
                <Input
                  id="receiptTotal"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={`Computed: ${formatCents(breakdown.totalCents, groupCurrency, locale)}`}
                  value={receiptTotalStr}
                  onChange={(e) => setReceiptTotalStr(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Override with the exact total printed on the receipt — the difference becomes a rounding line.
                </p>
              </div>
            )}

            {hasBreakdown && breakdown.subtotalCents > 0 && (
              <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCents(breakdown.subtotalCents, groupCurrency, locale)}</span>
                </div>
                {breakdown.serviceChargeCents > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Service / Tip</span>
                    <span>{formatCents(breakdown.serviceChargeCents, groupCurrency, locale)}</span>
                  </div>
                )}
                {breakdown.taxCents > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax</span>
                    <span>{formatCents(breakdown.taxCents, groupCurrency, locale)}</span>
                  </div>
                )}
                {roundingCents !== 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rounding</span>
                    <span>
                      {roundingCents > 0 ? "+" : ""}
                      {formatCents(roundingCents, groupCurrency, locale)}
                    </span>
                  </div>
                )}
                <div className="mt-1 flex justify-between border-t border-border pt-1 font-medium">
                  <span>Total</span>
                  <span>{formatCents(amountCents, groupCurrency, locale)}</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="category">Category (optional)</Label>
              <Input
                id="category"
                placeholder="e.g., Food, Transport"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paidBy">Paid by</Label>
              <select
                id="paidBy"
                value={paidById}
                onChange={(e) => setPaidById(e.target.value)}
                required
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select member</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name ?? "Unnamed"}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Split mode</Label>
              <div className="grid grid-cols-2 gap-2">
                {SPLIT_MODES.map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => setSplitMode(mode.value)}
                    className={`rounded-md border p-2 text-left text-sm transition-colors ${
                      splitMode === mode.value
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    <div className="font-medium">{mode.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {mode.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Split between</Label>
              {splitMode === "EQUAL" && (
                <EqualSplit
                  members={members}
                  totalCents={amountCents}
                  onChange={setShares}
                  locale={locale}
                  currency={group.data?.currency}
                />
              )}
              {splitMode === "EXACT" && (
                <ExactSplit
                  members={members}
                  totalCents={amountCents}
                  onChange={setShares}
                  locale={locale}
                  currency={group.data?.currency}
                />
              )}
              {splitMode === "PERCENTAGE" && (
                <PercentageSplit
                  members={members}
                  totalCents={amountCents}
                  onChange={setShares}
                  locale={locale}
                  currency={group.data?.currency}
                />
              )}
              {splitMode === "SHARES" && (
                <SharesSplit
                  members={members}
                  totalCents={amountCents}
                  onChange={setShares}
                  locale={locale}
                  currency={group.data?.currency}
                />
              )}
            </div>

            {updateExpense.error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {updateExpense.error.message}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={updateExpense.isPending || amountCents <= 0 || shares.length === 0}
            >
              {updateExpense.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
