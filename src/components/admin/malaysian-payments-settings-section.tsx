"use client";

import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Banknote } from "lucide-react";

export function MalaysianPaymentsSettingsSection() {
  const t = useTranslations("admin.malaysianPayments");

  const tng = trpc.admin.getTngEnabled.useQuery();
  const setTng = trpc.admin.setTngEnabled.useMutation({
    onSuccess: () => tng.refetch(),
  });

  const duitNow = trpc.admin.getDuitNowEnabled.useQuery();
  const setDuitNow = trpc.admin.setDuitNowEnabled.useMutation({
    onSuccess: () => duitNow.refetch(),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Banknote className="h-4 w-4" />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{t("description")}</p>

        <div className="space-y-2">
          <p className="text-sm font-medium">{t("tngLabel")}</p>
          <div className="flex items-center gap-3">
            <Button
              variant={tng.data?.enabled ? "default" : "outline"}
              size="sm"
              onClick={() => setTng.mutate({ enabled: !(tng.data?.enabled ?? false) })}
              disabled={setTng.isPending || tng.isLoading || !tng.data}
              data-testid="tng-toggle-btn"
            >
              {tng.data?.enabled ? t("enabled") : t("disabled")}
            </Button>
            <span className="text-xs text-muted-foreground">
              {tng.data?.enabled ? t("tngEnabledStatus") : t("tngDisabledStatus")}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">{t("duitNowLabel")}</p>
          <div className="flex items-center gap-3">
            <Button
              variant={duitNow.data?.enabled ? "default" : "outline"}
              size="sm"
              onClick={() => setDuitNow.mutate({ enabled: !(duitNow.data?.enabled ?? false) })}
              disabled={setDuitNow.isPending || duitNow.isLoading || !duitNow.data}
              data-testid="duitnow-toggle-btn"
            >
              {duitNow.data?.enabled ? t("enabled") : t("disabled")}
            </Button>
            <span className="text-xs text-muted-foreground">
              {duitNow.data?.enabled ? t("duitNowEnabledStatus") : t("duitNowDisabledStatus")}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
