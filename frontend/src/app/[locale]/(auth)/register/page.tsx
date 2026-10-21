"use client"

import { authApi } from "@/lib/api"
import { useAuthStore } from "@/stores/authStore"
import type { RegisterRequest, UserRole } from "@/types"
import { useRouter } from "@/i18n/navigation"
import { useRef, useEffect, useState } from "react"
import { useForm } from "@tanstack/react-form"
import { useMutation } from "@tanstack/react-query"
import { ROUTES } from "@/lib/routes"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import { Field, FieldLabel, fieldErrorId } from "@/components/ui/field"
import { FieldInfo } from "@/components/ui/form-field"
import { useTranslations } from "next-intl"
import {
  checkOptionalInt,
  parseOptionalInt,
  PROFILE_RANGES,
  type IntRange,
} from "@/lib/validations/profile"

// Type-scale utilities for the shared primitives. The Label/Input primitives
// ship `text-sm font-semibold leading-none`, which is off-scale; passing the
// token here lets twMerge drop those classes at the call site instead of
// editing the primitive for every consumer.
const labelClass = "text-caption-sm font-medium leading-normal"
const inputClass = "text-body-strong md:text-body-strong"

export default function RegisterPage() {
  const router = useRouter()
  const { login } = useAuthStore()
  const [error, setError] = useState<string>("")
  const formRef = useRef<HTMLFormElement>(null)
  const t = useTranslations("auth.register")
  // Same bounds and message as the profile form (models.UserProfile stores
  // these as int), so both live in the shared namespace.
  const tCommon = useTranslations("common")

  const intRule = (range: IntRange) => ({
    onChange: ({ value }: { value: string }) => {
      const failure = checkOptionalInt(value, range)
      return failure
        ? tCommon("validation.out_of_range", { min: failure.min, max: failure.max })
        : undefined
    },
  })

  const registerMutation = useMutation({
    mutationFn: (payload: RegisterRequest) => authApi.register(payload),
    onSuccess: async (_data, variables) => {
      // Auto-login after registration
      await login(variables.email, variables.password)

      // Mark the one-time welcome GIF as pending for the dashboard
      localStorage.setItem("gymtrack:welcome-gif-pending", "1")

      router.push(ROUTES.HOME)
    },
    onError: (err: unknown) => {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Registration failed. Please try again."
      setError(errorMessage)
    },
  })
  const isLoading = registerMutation.isPending

  const form = useForm({
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "athlete" as Exclude<UserRole, "admin">,
      name: "",
      age: "",
      weight: "",
      height: "",
      fitnessGoals: "",
      certifications: "",
      specializations: ""
    },
    onSubmit: ({ value }) => {
      setError("")

      // Reconstruct profile object
      const profile = {
        name: value.name,
        age: parseOptionalInt(value.age, PROFILE_RANGES.age).value,
        weight: parseOptionalInt(value.weight, PROFILE_RANGES.weight).value,
        height: parseOptionalInt(value.height, PROFILE_RANGES.height).value,
        fitnessGoals: value.fitnessGoals,
        certifications: value.certifications,
        specializations: value.specializations
      }

      registerMutation.mutate({
        username: value.username,
        email: value.email,
        password: value.password,
        role: value.role as Exclude<UserRole, "admin">,
        profile
      })
    }
  })

  useEffect(() => {
    const el = formRef.current
    if (!el) return
    const handler = (e: SubmitEvent) => {
      e.preventDefault()
      form.handleSubmit()
    }
    el.addEventListener("submit", handler)
    return () => el.removeEventListener("submit", handler)
  }, [form])

  useEffect(() => {
    ;(window as unknown as { __registerForm?: typeof form }).__registerForm = form
    return () => {
      delete (window as unknown as { __registerForm?: typeof form }).__registerForm
    }
  }, [form])

  return (
    <div className='rounded-none border border-border p-6 sm:p-8'>
      <p className='font-mono text-caption-sm text-muted-foreground'>
        Account
      </p>
      <h1 className='mb-6 mt-2 font-mono text-heading-xl text-foreground'>
        {t("title")}
      </h1>

      {error && (
        <div
          role='alert'
          className='mb-4 rounded-none border border-destructive/20 bg-destructive/5 p-3 text-caption text-destructive'
        >
          {error}
        </div>
      )}

      <form ref={formRef} className='space-y-6'>
        <form.Field
          name='username'
          validators={{
            onChange: ({ value }) => {
              if (!value || value.trim().length === 0) {
                return t("username.error.required")
              }
              if (value.length < 3) {
                return t("username.error.min_length")
              }
              if (value.length > 30) {
                return t("username.error.max_length")
              }
              if (!/^[a-zA-Z0-9]+$/.test(value)) {
                return t("username.error.invalid")
              }
              return undefined
            }
          }}
        >
          {(field) => (
            <Field>
              <FieldLabel className={labelClass} htmlFor='username'>{t("username.label")}</FieldLabel>
              <Input
                className={inputClass}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                type='text'
                id='username'
                placeholder={t("username.placeholder")}
                aria-describedby={fieldErrorId(field.name)}
              />
              <FieldInfo field={field} />
            </Field>
          )}
        </form.Field>

        <form.Field
          name='email'
          validators={{
            onChange: ({ value }) => {
              if (!value || value.trim().length === 0) {
                return t("email.error.required")
              }
              if (!/^[\S]+@[\S]+\.[\S]+$/.test(value)) {
                return t("email.error.invalid")
              }
              return undefined
            }
          }}
        >
          {(field) => (
            <Field>
              <FieldLabel className={labelClass} htmlFor='email'>{t("email.label")}</FieldLabel>
              <Input
                className={inputClass}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                type='email'
                id='email'
                placeholder={t("email.placeholder")}
                aria-describedby={fieldErrorId(field.name)}
              />
              <FieldInfo field={field} />
            </Field>
          )}
        </form.Field>

        <form.Field
          name='password'
          validators={{
            onChange: ({ value }) => {
              if (!value || value.length === 0) {
                return t("password.error.required")
              }
              if (value.length < 8) {
                return t("password.error.min_length")
              }
              return undefined
            }
          }}
        >
          {(field) => (
            <Field>
              <FieldLabel className={labelClass} htmlFor='password'>{t("password.label")}</FieldLabel>
              <Input
                className={inputClass}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                type='password'
                id='password'
                placeholder={t("password.placeholder")}
                aria-describedby={fieldErrorId(field.name)}
              />
              <FieldInfo field={field} />
            </Field>
          )}
        </form.Field>

        <form.Field
          name='confirmPassword'
          validators={{
            onChange: ({ value, fieldApi }) => {
              const password = fieldApi.form.state.values.password
              if (!value || value.length === 0) {
                return t("confirm_password.error.required")
              }
              if (value !== password) {
                return t("confirm_password.error.mismatch")
              }
              return undefined
            }
          }}
        >
          {(field) => (
            <Field>
              <FieldLabel className={labelClass} htmlFor='confirmPassword'>
                {t("confirm_password.label")}
              </FieldLabel>
              <Input
                className={inputClass}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                type='password'
                id='confirmPassword'
                placeholder={t("confirm_password.placeholder")}
                aria-describedby={fieldErrorId(field.name)}
              />
              <FieldInfo field={field} />
            </Field>
          )}
        </form.Field>

        <form.Field name='role'>
          {(field) => (
            <Field>
              <FieldLabel className={labelClass}>{t("role.label")}</FieldLabel>
              <div className='flex gap-6'>
                <label className='flex cursor-pointer items-center gap-2'>
                  <input
                    type='radio'
                    name='role'
                    checked={field.state.value === "athlete"}
                    onChange={() => field.handleChange("athlete")}
                    className='accent-primary'
                  />
                  <span className='text-body text-foreground'>
                    {t("role.athlete")}
                  </span>
                </label>
                <label className='flex cursor-pointer items-center gap-2'>
                  <input
                    type='radio'
                    name='role'
                    checked={field.state.value === "trainer"}
                    onChange={() => field.handleChange("trainer")}
                    className='accent-primary'
                  />
                  <span className='text-body text-foreground'>
                    {t("role.trainer")}
                  </span>
                </label>
              </div>
            </Field>
          )}
        </form.Field>

        <form.Field
          name='name'
          validators={{
            onChange: ({ value }) => {
              if (!value || value.trim().length === 0) {
                return t("name.error.required")
              }
              return undefined
            }
          }}
        >
          {(field) => (
            <Field>
              <FieldLabel className={labelClass} htmlFor='name'>{t("name.label")}</FieldLabel>
              <Input
                className={inputClass}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                type='text'
                id='name'
                placeholder={t("name.placeholder")}
                aria-describedby={fieldErrorId(field.name)}
              />
              <FieldInfo field={field} />
            </Field>
          )}
        </form.Field>

        <form.Subscribe selector={(s) => s.values.role as UserRole}>
          {(selectedRole) => (
            <>
              {selectedRole === "athlete" && (
                <>
                  <div className='grid grid-cols-2 gap-4'>
                    <form.Field name='age' validators={intRule(PROFILE_RANGES.age)}>
                      {(field) => (
                        <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
                          <FieldLabel className={labelClass} htmlFor='age'>
                            {t("age.label")}
                          </FieldLabel>
                          <Input
                            className={inputClass}
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            type='number'
                            inputMode='numeric'
                            step={1}
                            min={PROFILE_RANGES.age.min}
                            max={PROFILE_RANGES.age.max}
                            id='age'
                            placeholder={t("age.placeholder")}
                            aria-describedby={fieldErrorId(field.name)}
                          />
                          <FieldInfo field={field} />
                        </Field>
                      )}
                    </form.Field>
                    <form.Field name='weight' validators={intRule(PROFILE_RANGES.weight)}>
                      {(field) => (
                        <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
                          <FieldLabel className={labelClass} htmlFor='weight'>
                            {t("weight.label")}
                          </FieldLabel>
                          <Input
                            className={inputClass}
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            type='number'
                            inputMode='numeric'
                            step={1}
                            min={PROFILE_RANGES.weight.min}
                            max={PROFILE_RANGES.weight.max}
                            id='weight'
                            placeholder={t("weight.placeholder")}
                            aria-describedby={fieldErrorId(field.name)}
                          />
                          <FieldInfo field={field} />
                        </Field>
                      )}
                    </form.Field>
                  </div>

                  <form.Field name='height' validators={intRule(PROFILE_RANGES.height)}>
                    {(field) => (
                      <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
                        <FieldLabel className={labelClass} htmlFor='height'>
                          {t("height.label")}
                        </FieldLabel>
                        <Input
                          className={inputClass}
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                          type='number'
                          inputMode='numeric'
                          step={1}
                          min={PROFILE_RANGES.height.min}
                          max={PROFILE_RANGES.height.max}
                          id='height'
                          placeholder={t("height.placeholder")}
                          aria-describedby={fieldErrorId(field.name)}
                        />
                        <FieldInfo field={field} />
                      </Field>
                    )}
                  </form.Field>

                  <form.Field name='fitnessGoals'>
                    {(field) => (
                      <Field>
                        <FieldLabel className={labelClass} htmlFor='fitnessGoals'>
                          {t("fitness_goals.label")}
                        </FieldLabel>
                        <Textarea
                          className={inputClass}
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                          id='fitnessGoals'
                          placeholder={t("fitness_goals.placeholder")}
                          rows={3}
                        />
                      </Field>
                    )}
                  </form.Field>
                </>
              )}

              {selectedRole === "trainer" && (
                <>
                  <form.Field name='certifications'>
                    {(field) => (
                      <Field>
                        <FieldLabel className={labelClass} htmlFor='certifications'>
                          {t("certifications.label")}
                        </FieldLabel>
                        <Input
                          className={inputClass}
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                          type='text'
                          id='certifications'
                          placeholder={t("certifications.placeholder")}
                        />
                      </Field>
                    )}
                  </form.Field>

                  <form.Field name='specializations'>
                    {(field) => (
                      <Field>
                        <FieldLabel className={labelClass} htmlFor='specializations'>
                          {t("specializations.label")}
                        </FieldLabel>
                        <Input
                          className={inputClass}
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                          type='text'
                          id='specializations'
                          placeholder={t("specializations.placeholder")}
                        />
                      </Field>
                    )}
                  </form.Field>
                </>
              )}
            </>
          )}
        </form.Subscribe>
        <Button
          type='submit'
          disabled={isLoading}
          className='w-full rounded-none px-4 py-2 font-mono text-button-sm font-medium'
        >
          {isLoading ? (
            <>
              <Spinner /> {t("submitting")}
            </>
          ) : (
            t("submit")
          )}
        </Button>

        <p className='mt-4 text-center text-caption-sm text-muted-foreground'>
          {t("has_account")}{" "}
          <a
            href={ROUTES.LOGIN}
            className='font-mono text-caption-sm text-primary underline decoration-primary/30 underline-offset-4 transition-colors hover:decoration-primary'
          >
            {t("sign_in")}
          </a>
        </p>
      </form>
    </div>
  )
}
