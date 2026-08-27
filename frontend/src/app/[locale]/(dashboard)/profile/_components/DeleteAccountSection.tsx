"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { userApi } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { ROUTES } from "@/lib/routes";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle } from "lucide-react";

export function DeleteAccountSection() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const t = useTranslations("profile.delete_account");
  const logout = useAuthStore((s) => s.logout);

  const mutation = useMutation({
    mutationFn: (pw: string) => userApi.deleteAccount(pw),
    onSuccess: async () => {
      setOpen(false);
      await logout();
      router.push(ROUTES.LOGIN);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleSubmit = () => {
    if (!password) return;
    setError(null);
    mutation.mutate(password);
  };

  return (
    <>
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-destructive">{t("title")}</h3>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <Button
          variant="destructive"
          onClick={() => setOpen(true)}
        >
          {t("confirm")}
        </Button>
      </div>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("description")}</AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t("password_label")}</label>
            <Input
              type="password"
              placeholder={t("password_placeholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <AlertDialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); setPassword(""); setError(null); }}>
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleSubmit}
              disabled={mutation.isPending || !password}
            >
              {mutation.isPending ? "..." : t("confirm")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
