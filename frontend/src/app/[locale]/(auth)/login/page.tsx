"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useForm } from "@tanstack/react-form";
import { useTranslations } from "next-intl";
import { type LoginFormData } from "@/lib/validations/auth";
import { useAuthStore } from "@/stores/authStore";
import { ROUTES } from "@/lib/routes";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { FieldInfo } from "@/components/ui/form-field";
import { Spinner } from "@/components/ui/spinner";

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
        const user = await login(value.identifier, value.password);

        // Add a small delay to ensure tokens are persisted in localStorage
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Redirect based on user role
        if (user?.role === "athlete") {
          router.push(ROUTES.ATHLETE_WORKOUTS);
        } else if (user?.role === "trainer") {
          router.push(ROUTES.TRAINER_CLIENTS);
        } else {
          router.push(ROUTES.PROFILE);
        }
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
    <div className="rounded-lg bg-card p-8 shadow-xl">
      <h2 className="mb-6 text-2xl font-semibold text-card-foreground">
        {t("title")}
      </h2>

      {error && (
        <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
        className="space-y-4"
      >
        <form.Field
          name="identifier"
          validators={{
            onChange: ({ value }) => {
              if (!value || value.trim().length === 0) {
                return t("email.error.required");
              }
              // Check if it's a valid email
              if (/^[\S]+@[\S]+\.[\S]+$/.test(value)) {
                return undefined;
              }
              // Check if it's a valid username format (3-30 alphanumeric)
              if (/^[a-zA-Z0-9]{3,30}$/.test(value)) {
                return undefined;
              }
              return t("email.error.invalid");
            },
          }}
        >
          {(field) => (
            <Field>
              <FieldLabel htmlFor="identifier">{t("email.label")}</FieldLabel>
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                type="text"
                id="identifier"
                placeholder={t("email.placeholder")}
                className="mt-1 block w-full rounded-md border border-input px-3 py-2 shadow-sm focus:border-ring focus:outline-none focus:ring-ring"
              />
              <FieldInfo field={field} />
            </Field>
          )}
        </form.Field>

        <form.Field
          name="password"
          validators={{
            onChange: ({ value }) => {
              if (!value || value.length === 0) {
                return t("password.error.required");
              }
              if (value.length < 6) {
                return t("password.error.min_length");
              }
              return undefined;
            },
          }}
        >
          {(field) => (
            <Field>
              <FieldLabel htmlFor="password">{t("password.label")}</FieldLabel>
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                type="password"
                id="password"
                placeholder={t("password.placeholder")}
                className="mt-1 block w-full rounded-md border border-input px-3 py-2 shadow-sm focus:border-ring focus:outline-none focus:ring-ring"
              />
              <FieldInfo field={field} />
            </Field>
          )}
        </form.Field>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-md bg-primary px-4 py-2 text-primary-foreground font-semibold shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Spinner className="mr-2" />
              {t("submitting")}
            </>
          ) : (
            t("submit")
          )}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        {t("no_account")}{" "}
        <a
          href={ROUTES.REGISTER}
          className="font-medium text-primary hover:text-primary/80"
        >
          {t("sign_up")}
        </a>
      </p>
    </div>
  );
}
