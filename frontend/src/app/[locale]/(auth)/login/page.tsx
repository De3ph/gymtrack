"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useForm } from "@tanstack/react-form";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { type LoginFormData } from "@/lib/validations/auth";
import { useAuthStore } from "@/stores/authStore";
import { ROUTES } from "@/lib/routes";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { FieldInfo } from "@/components/ui/form-field";
import { Spinner } from "@/components/ui/spinner";
import { Separator } from "@/components/ui/separator";
import { stagger, reveal } from "@/components/features/auth/auth-variants";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const t = useTranslations("auth.login");
  const tCommon = useTranslations("common");
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm({
    defaultValues: {
      identifier: "",
      password: "",
    } satisfies LoginFormData,
    onSubmit: async ({ value }) => {
      setIsLoading(true);
      setError("");

      try {
        await login(value.identifier, value.password);
        router.push(ROUTES.DASHBOARD);
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : tCommon("errors.generic");
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
  });

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={stagger}
      className="w-full"
    >
      <motion.div variants={reveal} className="mb-8 h-1 w-12 bg-primary" />

      <motion.div variants={reveal} className="mb-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-muted-foreground">
          Account
        </p>
        <h2 className="mt-2 font-mono text-3xl font-semibold leading-none tracking-[-0.04em] text-foreground">
          {t("title")}
        </h2>
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-8 border-l border-destructive bg-destructive/5 px-4 py-3"
        >
          <p className="text-sm text-destructive">{error}</p>
        </motion.div>
      )}

      <motion.form
        variants={stagger}
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
        className="space-y-7"
      >
        <motion.div variants={reveal}>
          <form.Field
            name="identifier"
            validators={{
              onChange: ({ value }) => {
                if (!value || value.trim().length === 0) {
                  return t("email.error.required");
                }
                if (/^[\S]+@[\S]+\.[\S]+$/.test(value)) {
                  return undefined;
                }
                if (/^[a-zA-Z0-9]{3,30}$/.test(value)) {
                  return undefined;
                }
                return t("email.error.invalid");
              },
            }}
          >
            {(field) => (
              <Field>
                <FieldLabel
                  htmlFor="identifier"
                  className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground"
                >
                  {t("email.label")}
                </FieldLabel>
                <Input
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  type="text"
                  id="identifier"
                 
                  placeholder={t("email.placeholder")}
                  className="block w-full border-0 border-b border-border bg-transparent px-0 py-3 text-base font-semibold text-foreground placeholder:text-muted-foreground/50 transition-colors duration-200 focus:border-primary focus:outline-none focus:ring-0 aria-invalid:border-destructive"
                />
                <FieldInfo field={field} />
              </Field>
            )}
          </form.Field>
        </motion.div>

        <motion.div variants={reveal}>
          <form.Field
            name="password"
            validators={{
              onChange: ({ value }) => {
                if (!value || value.length === 0) {
                  return t("password.error.required");
                }
                if (value.length < 8) {
                  return t("password.error.min_length");
                }
                return undefined;
              },
            }}
          >
            {(field) => (
              <Field>
                <FieldLabel
                  htmlFor="password"
                  className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground"
                >
                  {t("password.label")}
                </FieldLabel>
                <Input
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  type="password"
                  id="password"
                 
                  placeholder={t("password.placeholder")}
                  className="block w-full border-0 border-b border-border bg-transparent px-0 py-3 text-base font-semibold text-foreground placeholder:text-muted-foreground/50 transition-colors duration-200 focus:border-primary focus:outline-none focus:ring-0 aria-invalid:border-destructive"
                />
                <FieldInfo field={field} />
              </Field>
            )}
          </form.Field>
        </motion.div>

        <motion.div variants={reveal} className="pt-1 text-right">
          <a
            href={ROUTES.FORGOT_PASSWORD}
            className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("forgot_password")}
          </a>
        </motion.div>

        <motion.div variants={reveal} className="pt-2">
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-none px-8 py-4 font-mono text-xs uppercase tracking-[0.18em]"
          >
            <span className="flex items-center justify-center gap-3">
              {isLoading ? (
                <>
                  <Spinner className="size-5" />
                  {t("submitting")}
                </>
              ) : (
                <>
                  {t("submit")}
                  <ArrowRight className="size-5" aria-hidden="true" />
                </>
              )}
            </span>
          </Button>
        </motion.div>
      </motion.form>

      <motion.div
        variants={reveal}
        className="mt-12 flex items-center gap-2"
      >
        <Separator className="flex-1" />
        <p className="text-xs text-muted-foreground">
          {t("no_account")}{" "}
          <a
            href={ROUTES.REGISTER}
            className="font-mono text-xs font-medium uppercase tracking-[0.1em] text-primary underline decoration-primary/30 underline-offset-4 transition-colors hover:decoration-primary"
          >
            {t("sign_up")}
          </a>
        </p>
        <Separator className="flex-1" />
      </motion.div>
    </motion.div>
  );
}
