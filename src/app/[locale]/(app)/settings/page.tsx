"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function SettingsPage() {
  const t = useTranslations("settings");
  const tMy = useTranslations("settings.paymentMethodsMy");
  const { data: session, update } = useSession();
  const router = useRouter();
  const [name, setName] = useState(session?.user?.name ?? "");
  const [venmoUsername, setVenmoUsername] = useState("");
  const [venmoTouched, setVenmoTouched] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);

  const profile = trpc.auth.getProfile.useQuery();
  const utils = trpc.useUtils();

  useEffect(() => {
    if (session?.user?.name && !hasSaved) {
      setName(session.user.name);
    }
  }, [session?.user?.name, hasSaved]);

  useEffect(() => {
    if (profile.data && !venmoTouched) {
      setVenmoUsername(profile.data.venmoUsername ?? "");
    }
  }, [profile.data, venmoTouched]);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // ─── Malaysian payment methods (TNG phone + DuitNow QR) ───
  const [tngPhone, setTngPhone] = useState("");
  const [tngTouched, setTngTouched] = useState(false);
  const [isUploadingQr, setIsUploadingQr] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile.data && !tngTouched) {
      setTngPhone(profile.data.tngPhoneNumber ?? "");
    }
  }, [profile.data, tngTouched]);

  const updateProfile = trpc.auth.updateProfile.useMutation({
    onSuccess: async () => {
      setHasSaved(true);
      await update();
      router.refresh();
    },
  });

  const changePassword = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
  });

  const saveTngPhone = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      utils.auth.getProfile.invalidate();
      toast.success(tMy("saved"));
    },
  });

  const saveQrPath = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      utils.auth.getProfile.invalidate();
      toast.success(tMy("saved"));
    },
  });

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    updateProfile.mutate({
      name,
      ...(venmoTouched || profile.data ? { venmoUsername: venmoUsername.trim() || null } : {}),
    });
  }

  function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) return;
    changePassword.mutate({ currentPassword, newPassword });
  }

  function handleSaveTng(e: React.FormEvent) {
    e.preventDefault();
    saveTngPhone.mutate({ tngPhoneNumber: tngPhone.trim() || null });
  }

  async function handleUploadQr(file: File) {
    setIsUploadingQr(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload/qr", { method: "POST", body: formData });
      const body: { qrPath?: string; error?: string } = await res.json();
      if (!res.ok || !body.qrPath) {
        throw new Error(body.error ?? "Upload failed");
      }
      saveQrPath.mutate({ duitNowQrPath: body.qrPath });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tMy("uploadFailed"));
    } finally {
      setIsUploadingQr(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleRemoveQr() {
    saveQrPath.mutate({ duitNowQrPath: null });
  }

  const duitNowQrPath = profile.data?.duitNowQrPath ?? null;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t("profile.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("profile.email")}</Label>
              <Input id="email" value={session?.user?.email ?? ""} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">{t("profile.name")}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="venmo">{t("profile.venmo")}</Label>
              <Input
                id="venmo"
                value={venmoUsername}
                onChange={(e) => { setVenmoTouched(true); setVenmoUsername(e.target.value); }}
                placeholder={t("profile.venmoPlaceholder")}
                data-testid="venmo-username-input"
              />
            </div>
            <Button type="submit" disabled={updateProfile.isPending} data-testid="save-profile-btn">
              {updateProfile.isPending ? t("profile.saving") : t("profile.save")}
            </Button>
            {updateProfile.isSuccess && (
              <p className="text-sm text-green-600">{t("profile.saved")}</p>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("password.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">{t("password.current")}</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                minLength={1}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">{t("password.new")}</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t("password.confirm")}</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-sm text-red-600">{t("password.mismatch")}</p>
              )}
            </div>
            <Button
              type="submit"
              disabled={changePassword.isPending || newPassword !== confirmPassword || !currentPassword || !newPassword}
            >
              {changePassword.isPending ? t("password.submitting") : t("password.submit")}
            </Button>
            {changePassword.isSuccess && (
              <p className="text-sm text-green-600">{t("password.success")}</p>
            )}
            {changePassword.error && (
              <p className="text-sm text-red-600">{changePassword.error.message}</p>
            )}
          </form>
        </CardContent>
      </Card>

      <Card data-testid="payment-methods-my-card">
        <CardHeader>
          <CardTitle>{tMy("title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSaveTng} className="space-y-2">
            <Label htmlFor="tngPhone">{tMy("tngPhone")}</Label>
            <Input
              id="tngPhone"
              value={tngPhone}
              onChange={(e) => { setTngTouched(true); setTngPhone(e.target.value); }}
              placeholder={tMy("tngPhonePlaceholder")}
              maxLength={32}
              data-testid="tng-phone-input"
            />
            <p className="text-xs text-muted-foreground">{tMy("tngPhoneHelp")}</p>
            <Button type="submit" disabled={saveTngPhone.isPending} data-testid="save-tng-btn">
              {saveTngPhone.isPending ? t("profile.saving") : t("profile.save")}
            </Button>
          </form>

          <div className="space-y-2">
            <Label>{tMy("duitNowQr")}</Label>
            <p className="text-xs text-muted-foreground">{tMy("duitNowQrHelp")}</p>
            {duitNowQrPath ? (
              <div className="space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/uploads/${duitNowQrPath}`}
                  alt="DuitNow QR"
                  className="h-48 w-48 rounded-md border object-contain bg-white"
                  data-testid="duitnow-qr-preview"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingQr || saveQrPath.isPending}
                    data-testid="replace-qr-btn"
                  >
                    {tMy("replaceQr")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRemoveQr}
                    disabled={isUploadingQr || saveQrPath.isPending}
                    data-testid="remove-qr-btn"
                  >
                    {tMy("removeQr")}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingQr || saveQrPath.isPending}
                data-testid="upload-qr-btn"
              >
                {isUploadingQr ? t("profile.saving") : tMy("uploadQr")}
              </Button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/heic"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUploadQr(file);
              }}
              data-testid="qr-file-input"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
