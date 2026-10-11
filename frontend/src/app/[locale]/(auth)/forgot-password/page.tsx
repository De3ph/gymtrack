"use client";

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { motion } from "motion/react";
import { ArrowLeft, ArrowRight, RotateCw } from "lucide-react";
import { type ForgotPasswordFormData } from "@/lib/validations/auth";
import { authApi } from "@/lib/api/authApi";
import { ROUTES } from "@/lib/routes";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, fieldErrorId } from "@/components/ui/field";
import { FieldInfo } from "@/components/ui/form-field";
import { Spinner } from "@/components/ui/spinner";
import { stagger, reveal } from "@/components/features/auth/auth-variants";
import { useReducedMotion } from "@/components/features/landing/useReducedMotion";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth.forgot_password");
  const reducedMotion = useReducedMotion();
  const [submittedEmail, setSubmittedEmail] = useState<string>("");
  const [error, setError] = useState<string>("");

  const toErrorMessage = (err: unknown) => {
    const status = (err as { status?: number }).status;
    return status === 429
      ? t("error.too_many")
      : err instanceof Error
        ? err.message
        : t("error.network");
  };

  const resetMutation = useMutation({
    mutationFn: (email: string) => authApi.requestPasswordReset({ email }),
    onSuccess: (_data, email) => {
      setError("");
      setSubmittedEmail(email);
    },
    onError: (err: unknown) => {
      setError(toErrorMessage(err));
    },
  });
  const isLoading = resetMutation.isPending;
  const isResending = resetMutation.isPending;

  const form = useForm({
    defaultValues: {
      email: "",
    } satisfies ForgotPasswordFormData,
    onSubmit: ({ value }) => {
      setError("");
      resetMutation.mutate(value.email);
    },
  });

  function handleResend() {
    if (!submittedEmail || resetMutation.isPending) return;
    setError("");
    resetMutation.mutate(submittedEmail);
  }

  if (submittedEmail) {
    return (
      <motion.div
        key="sent"
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
            {t("success.title")}
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

        <motion.div variants={reveal} className="space-y-3">
          <p className="text-base leading-relaxed text-foreground">
            {t("success.subtitle", { email: submittedEmail })}
          </p>
          <p className="font-mono text-sm font-semibold text-foreground">
            {submittedEmail}
          </p>
        </motion.div>

        <motion.div variants={reveal} className="mt-12 flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {t("success.didnt_get_it")}
          </span>
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending}
            className="group inline-flex items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-foreground underline decoration-foreground/30 underline-offset-4 transition-colors hover:decoration-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isResending ? (
              <>
                <Spinner className="size-3" />
                {t("success.resending")}
              </>
            ) : (
              <>
                {t("success.resend")}
                <RotateCw
                  className={`size-3 ${reducedMotion ? "" : "transition-transform duration-300 group-hover:rotate-90"}`}
                  aria-hidden="true"
                />
              </>
            )}
          </button>
        </motion.div>

        <motion.div variants={reveal} className="mt-16">
          <a
            href={ROUTES.LOGIN}
            className="inline-flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            {t("back_to_login")}
          </a>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      key="form"
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
        <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
          {t("subtitle")}
        </p>
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
            name="email"
            validators={{
              onChange: ({ value }) => {
                if (!value || value.trim().length === 0) {
                  return t("email.error.required");
                }
                if (!/^[\S]+@[\S]+\.[\S]+$/.test(value)) {
                  return t("email.error.invalid");
                }
                return undefined;
              },
            }}
          >
            {(field) => (
              <Field>
                <FieldLabel
                  htmlFor="email"
                  className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground"
                >
                  {t("email.label")}
                </FieldLabel>
                <Input
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  type="email"
                  id="email"
                  autoComplete="email"
                  placeholder={t("email.placeholder")}
                  className="block w-full border-0 border-b border-border bg-transparent px-0 py-3 text-base font-semibold text-foreground placeholder:text-muted-foreground/50 transition-colors duration-200 focus:border-primary focus:outline-none focus:ring-0 aria-invalid:border-destructive"
                  aria-describedby={fieldErrorId(field.name)}
                />
                <FieldInfo field={field} />
              </Field>
            )}
          </form.Field>
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
        className="mt-12 flex items-center gap-3 border-t border-border/60 pt-6"
      >
        <motion.span
          aria-hidden="true"
          className="font-mono text-[10px] text-muted-foreground/60"
          animate={reducedMotion ? undefined : { opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        >
          &gt;
        </motion.span>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
          {t("hints.check_spam")}
        </p>
        <span className="text-muted-foreground/30" aria-hidden="true">·</span>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
          {t("hints.expires_in")}
        </p>
        <span className="text-muted-foreground/30" aria-hidden="true">·</span>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
          {t("hints.didnt_get")}
        </p>
      </motion.div>

      <motion.div variants={reveal} className="mt-8">
        <a
          href={ROUTES.LOGIN}
          className="inline-flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          {t("back_to_login")}
        </a>
      </motion.div>
    </motion.div>
  );
}
