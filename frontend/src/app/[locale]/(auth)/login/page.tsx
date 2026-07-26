"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useForm } from "@tanstack/react-form";
import { useTranslations } from "next-intl";
import { motion } from "motion/react";
import { type LoginFormData } from "@/lib/validations/auth";
import { useAuthStore } from "@/stores/authStore";
import { ROUTES } from "@/lib/routes";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { FieldInfo } from "@/components/ui/form-field";
import { Spinner } from "@/components/ui/spinner";

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.12 },
  },
};

const fadeSlideUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

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
      <motion.div variants={fadeSlideUp} className="mb-8 h-1 w-12 bg-primary" />

      <motion.div variants={fadeSlideUp} className="mb-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-muted-foreground">
          Account
        </p>
        <h2 className="mt-2 text-3xl font-black leading-none tracking-tight text-foreground">
          {t("title")}
        </h2>
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-8 border-l-2 border-destructive bg-destructive/5 px-4 py-3"
        >
          <p className="text-sm font-medium text-destructive">{error}</p>
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
        <motion.div variants={fadeSlideUp}>
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
                  className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground"
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
                  className="block w-full border-0 border-b-2 border-border bg-transparent px-0 py-3 text-base font-medium text-foreground placeholder:text-muted-foreground/50 transition-colors duration-200 focus:border-primary focus:outline-none focus:ring-0 aria-invalid:border-destructive"
                />
                <FieldInfo field={field} />
              </Field>
            )}
          </form.Field>
        </motion.div>

        <motion.div variants={fadeSlideUp}>
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
                  className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground"
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
                  className="block w-full border-0 border-b-2 border-border bg-transparent px-0 py-3 text-base font-medium text-foreground placeholder:text-muted-foreground/50 transition-colors duration-200 focus:border-primary focus:outline-none focus:ring-0 aria-invalid:border-destructive"
                />
                <FieldInfo field={field} />
              </Field>
            )}
          </form.Field>
        </motion.div>

        <motion.div variants={fadeSlideUp} className="pt-1 text-right">
          <a
            href="#"
            className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("forgot_password")}
          </a>
        </motion.div>

        <motion.div variants={fadeSlideUp} className="pt-2">
          <Button
            type="submit"
            disabled={isLoading}
            className="group relative w-full overflow-hidden border-0 bg-primary px-8 py-4 text-sm font-bold uppercase tracking-[0.2em] text-primary-foreground shadow-none transition-all duration-300 hover:tracking-[0.25em] focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="relative z-10 flex items-center justify-center gap-3">
              {isLoading ? (
                <>
                  <Spinner className="size-4" />
                  {t("submitting")}
                </>
              ) : (
                <>
                  {t("submit")}
                  <span className="transition-transform duration-300 group-hover:translate-x-1 group-active:translate-x-2">
                    &rarr;
                  </span>
                </>
              )}
            </span>
            <span className="absolute inset-0 origin-left scale-x-0 bg-primary-foreground/10 transition-transform duration-300 group-hover:scale-x-100" />
          </Button>
        </motion.div>
      </motion.form>

      <motion.div
        variants={fadeSlideUp}
        className="mt-12 flex items-center gap-2"
      >
        <span className="h-px flex-1 bg-border" />
        <p className="text-xs text-muted-foreground">
          {t("no_account")}{" "}
          <a
            href={ROUTES.REGISTER}
            className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-primary underline decoration-primary/30 underline-offset-4 transition-all hover:decoration-primary"
          >
            {t("sign_up")}
          </a>
        </p>
        <span className="h-px flex-1 bg-border" />
      </motion.div>
    </motion.div>
  );
}
