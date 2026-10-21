"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useForm } from "@tanstack/react-form";
import { useTranslations } from "next-intl";
import { ArrowRight, Eye, EyeOff, Lock, User } from "lucide-react";
import { motion } from "motion/react";
import { type LoginFormData } from "@/lib/validations/auth";
import { useAuthStore } from "@/stores/authStore";
import { ROUTES } from "@/lib/routes";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, fieldErrorId } from "@/components/ui/field";
import { FieldInfo } from "@/components/ui/form-field";
import { Spinner } from "@/components/ui/spinner";
import { Separator } from "@/components/ui/separator";
import { stagger, reveal } from "@/components/features/auth/auth-variants";

/**
 * Explains why the user landed on the login page when the server ended a
 * dead session (see verifySession in lib/dal.ts).
 *
 * Isolated in its own component so `useSearchParams` stays behind a Suspense
 * boundary, as Next.js requires for statically rendered routes.
 */
function SessionExpiredNotice() {
  const searchParams = useSearchParams();
  const t = useTranslations("auth.login");

  if (searchParams.get("reason") !== "session_expired") {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="mb-8 border-l border-destructive bg-destructive/5 px-4 py-3"
    >
      <p className="text-sm font-medium text-destructive">{t("session_expired_notice")}</p>
    </motion.div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const t = useTranslations("auth.login");
  const tAuth = useTranslations("auth");
  const tCommon = useTranslations("common");
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
        <p className="font-mono text-xs font-medium text-muted-foreground">
          {tAuth("account")}
        </p>
        <h1 className="mt-2 font-mono text-3xl font-medium text-foreground">
          {t("title")}
        </h1>
      </motion.div>

      <Suspense fallback={null}>
        <SessionExpiredNotice />
      </Suspense>

      {error && (
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-8 border-l border-destructive bg-destructive/5 px-4 py-3"
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
        <motion.div variants={reveal}>
          <form.Field
            name="identifier"
            validators={{
              onChange: ({ value }) => {
                const identifier = value?.trim() ?? "";
                if (identifier.length === 0) {
                  return t("email.error.required");
                }
                // Mirrors the backend: an email address, or a 3-30 character
                // alphanumeric username (models.User validate tag).
                if (/^[\S]+@[\S]+\.[\S]+$/.test(identifier)) {
                  return undefined;
                }
                if (/^[a-zA-Z0-9]{3,30}$/.test(identifier)) {
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
                  className="mb-2 font-mono text-xs font-medium leading-normal text-muted-foreground"
                >
                  {t("email.label")}
                </FieldLabel>
                <div className="group relative">
                  <User
                    className="pointer-events-none absolute left-0 top-1/2 size-5 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-focus-within:text-primary"
                    aria-hidden="true"
                  />
                  <Input
                    value={field.state.value}
                    onChange={(e) => {
                      field.handleChange(e.target.value);
                      // Editing after a failed attempt should clear the stale
                      // banner; otherwise "Invalid credentials" sits on screen
                      // while the user is actively correcting the field.
                      if (error) setError("");
                    }}
                    onBlur={field.handleBlur}
                    type="text"
                    id="identifier"

                    placeholder={t("email.placeholder")}
                    className="block w-full border-0 border-b border-border bg-transparent py-3 pl-10 pr-0 text-base font-medium text-foreground placeholder:text-muted-foreground/50 transition-colors duration-200 focus:border-primary focus:outline-none focus:ring-0 aria-invalid:border-destructive"
                    aria-describedby={fieldErrorId(field.name)}
                  />
                </div>
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
                  className="mb-2 font-mono text-xs font-medium leading-normal text-muted-foreground"
                >
                  {t("password.label")}
                </FieldLabel>
                <div className="group relative">
                  <Lock
                    className="pointer-events-none absolute left-0 top-1/2 size-5 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-focus-within:text-primary"
                    aria-hidden="true"
                  />
                  <Input
                    value={field.state.value}
                    onChange={(e) => {
                      field.handleChange(e.target.value);
                      if (error) setError("");
                    }}
                    onBlur={field.handleBlur}
                    type={showPassword ? "text" : "password"}
                    id="password"

                    placeholder={t("password.placeholder")}
                    className="block w-full border-0 border-b border-border bg-transparent py-3 pl-10 pr-11 text-base font-medium text-foreground placeholder:text-muted-foreground/50 transition-colors duration-200 focus:border-primary focus:outline-none focus:ring-0 aria-invalid:border-destructive"
                    aria-describedby={fieldErrorId(field.name)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-0 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center text-muted-foreground transition-colors duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    aria-label={showPassword ? t("password.hide") : t("password.show")}
                    aria-pressed={showPassword}
                    aria-controls="password"
                  >
                    {showPassword ? (
                      <EyeOff className="size-5" aria-hidden="true" />
                    ) : (
                      <Eye className="size-5" aria-hidden="true" />
                    )}
                  </button>
                </div>
                <FieldInfo field={field} />
              </Field>
            )}
          </form.Field>
        </motion.div>

        <motion.div variants={reveal} className="pt-1 text-right">
          <a
            href={ROUTES.FORGOT_PASSWORD}
            className="font-mono text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("forgot_password")}
          </a>
        </motion.div>

        <motion.div variants={reveal} className="pt-2">
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-none px-8 py-4 font-mono text-sm font-medium"
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
        <p className="text-xs font-medium text-muted-foreground">
          {t("no_account")}{" "}
          <a
            href={ROUTES.REGISTER}
            className="font-mono text-xs font-medium text-primary underline decoration-primary/30 underline-offset-4 transition-colors hover:decoration-primary"
          >
            {t("sign_up")}
          </a>
        </p>
        <Separator className="flex-1" />
      </motion.div>
    </motion.div>
  );
}
