"use client";

import { useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { Combobox } from "@base-ui/react/combobox";
import { CheckIcon, ChevronDownIcon, SearchIcon } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";

const EMOJI_OPTIONS = ["💰", "🏠", "✈️", "🍽️", "🎉", "🛒", "🚗", "💼"];

type CurrencyOption = { value: string; label: string };

export default function NewGroupPage() {
  const router = useRouter();
  const locale = useLocale();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [emoji, setEmoji] = useState("💰");

  const currencyOptions = useMemo<CurrencyOption[]>(() => {
    const codes = Intl.supportedValuesOf("currency");
    const displayNames = new Intl.DisplayNames([locale], { type: "currency" });
    return codes
      .map((code) => ({ value: code, label: `${code} — ${displayNames.of(code) ?? code}` }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [locale]);

  const selectedCurrency = useMemo(
    () => currencyOptions.find((c) => c.value === currency) ?? null,
    [currencyOptions, currency],
  );

  const createGroup = trpc.groups.create.useMutation({
    onSuccess: (group) => {
      router.push(`/groups/${group.id}`);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createGroup.mutate({
      name,
      description: description || undefined,
      currency,
      emoji,
    });
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-2xl font-bold">Create a new group</h1>
      <Card>
        <CardHeader>
          <CardTitle>Group details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Group name</Label>
              <Input
                id="name"
                placeholder="e.g., Apartment, Trip to Japan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                placeholder="What is this group for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
              />
            </div>

            <div className="space-y-2">
              <Label>Icon</Label>
              <div className="flex flex-wrap gap-2">
                {EMOJI_OPTIONS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEmoji(e)}
                    className={`flex h-10 w-10 items-center justify-center rounded-md border text-lg transition-colors ${
                      emoji === e
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Combobox.Root
                items={currencyOptions}
                value={selectedCurrency}
                onValueChange={(option: CurrencyOption | null) => {
                  if (option) setCurrency(option.value);
                }}
              >
                <Combobox.Trigger
                  id="currency"
                  className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-left text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring data-[popup-open]:ring-1 data-[popup-open]:ring-ring"
                >
                  <span className="truncate">{selectedCurrency?.label ?? currency}</span>
                  <Combobox.Icon
                    render={<ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />}
                  />
                </Combobox.Trigger>
                <Combobox.Portal>
                  <Combobox.Positioner sideOffset={4} className="isolate z-50">
                    <Combobox.Popup className="max-h-[min(20rem,var(--available-height))] w-[var(--anchor-width)] overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md">
                      <div className="flex items-center gap-2 border-b border-border px-3">
                        <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
                        <Combobox.Input
                          placeholder="Search currencies..."
                          className="h-9 flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground"
                        />
                      </div>
                      <Combobox.Empty className="px-3 text-center text-sm text-muted-foreground not-empty:py-6">
                        No currency found.
                      </Combobox.Empty>
                      <Combobox.List className="overflow-y-auto p-1">
                        {(item: CurrencyOption) => (
                          <Combobox.Item
                            key={item.value}
                            value={item}
                            className="relative flex w-full cursor-default select-none items-center justify-between gap-2 rounded-sm py-1.5 pl-2 pr-7 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
                          >
                            <span className="truncate">{item.label}</span>
                            <Combobox.ItemIndicator className="absolute right-2 flex size-4 items-center justify-center">
                              <CheckIcon className="size-4" />
                            </Combobox.ItemIndicator>
                          </Combobox.Item>
                        )}
                      </Combobox.List>
                    </Combobox.Popup>
                  </Combobox.Positioner>
                </Combobox.Portal>
              </Combobox.Root>
            </div>

            {createGroup.error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {createGroup.error.message}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={createGroup.isPending}>
              {createGroup.isPending ? "Creating..." : "Create Group"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
