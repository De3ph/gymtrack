"use client"

import { authApi } from "@/lib/api"
import { useAuthStore } from "@/stores/authStore"
import type { UserRole } from "@/types"
import { useRouter } from "@/i18n/navigation"
import { useRef, useEffect, useState } from "react"
import { useForm } from "@tanstack/react-form"
import { ROUTES } from "@/lib/routes"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import { Field, FieldLabel } from "@/components/ui/field"
import { FieldInfo } from "@/components/ui/form-field"
import { useTranslations } from "next-intl"

export default function RegisterPage() {
  const router = useRouter()
  const { login } = useAuthStore()
  const [error, setError] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const t = useTranslations("auth.register")

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
    onSubmit: async ({ value }) => {
      setIsLoading(true)
      setError("")

      try {
        // Reconstruct profile object
        const profile = {
          name: value.name,
          age: value.age ? Number(value.age) : undefined,
          weight: value.weight ? Number(value.weight) : undefined,
          height: value.height ? Number(value.height) : undefined,
          fitnessGoals: value.fitnessGoals,
          certifications: value.certifications,
          specializations: value.specializations
        }

        // Register user
        await authApi.register({
          username: value.username,
          email: value.email,
          password: value.password,
          role: value.role as Exclude<UserRole, "admin">,
          profile
        })

        // Auto-login after registration
        await login(value.email, value.password)
        router.push(ROUTES.HOME)
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Registration failed. Please try again."
        setError(errorMessage)
      } finally {
        setIsLoading(false)
      }
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
      <p className='font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground'>
        Account
      </p>
      <h2 className='mb-6 mt-2 font-mono text-3xl font-semibold leading-none tracking-[-0.04em] text-foreground'>
        {t("title")}
      </h2>

      {error && (
        <div
          role='alert'
          className='mb-4 rounded-none border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive'
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
              <FieldLabel htmlFor='username'>{t("username.label")}</FieldLabel>
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                type='text'
                id='username'
                placeholder={t("username.placeholder")}
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
              <FieldLabel htmlFor='email'>{t("email.label")}</FieldLabel>
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                type='email'
                id='email'
                placeholder={t("email.placeholder")}
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
              <FieldLabel htmlFor='password'>{t("password.label")}</FieldLabel>
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                type='password'
                id='password'
                placeholder={t("password.placeholder")}
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
              <FieldLabel htmlFor='confirmPassword'>
                {t("confirm_password.label")}
              </FieldLabel>
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                type='password'
                id='confirmPassword'
                placeholder={t("confirm_password.placeholder")}
              />
              <FieldInfo field={field} />
            </Field>
          )}
        </form.Field>

        <form.Field name='role'>
          {(field) => (
            <Field>
              <FieldLabel>{t("role.label")}</FieldLabel>
              <div className='flex gap-6'>
                <label className='flex cursor-pointer items-center gap-2'>
                  <input
                    type='radio'
                    name='role'
                    checked={field.state.value === "athlete"}
                    onChange={() => field.handleChange("athlete")}
                    className='accent-primary'
                  />
                  <span className='text-sm text-foreground'>
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
                  <span className='text-sm text-foreground'>
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
              <FieldLabel htmlFor='name'>{t("name.label")}</FieldLabel>
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                type='text'
                id='name'
                placeholder={t("name.placeholder")}
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
                    <form.Field name='age'>
                      {(field) => (
                        <Field>
                          <FieldLabel htmlFor='age'>
                            {t("age.label")}
                          </FieldLabel>
                          <Input
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            type='number'
                            id='age'
                            placeholder={t("age.placeholder")}
                          />
                        </Field>
                      )}
                    </form.Field>
                    <form.Field name='weight'>
                      {(field) => (
                        <Field>
                          <FieldLabel htmlFor='weight'>
                            {t("weight.label")}
                          </FieldLabel>
                          <Input
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            type='number'
                            id='weight'
                            placeholder={t("weight.placeholder")}
                          />
                        </Field>
                      )}
                    </form.Field>
                  </div>

                  <form.Field name='height'>
                    {(field) => (
                      <Field>
                        <FieldLabel htmlFor='height'>
                          {t("height.label")}
                        </FieldLabel>
                        <Input
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                          type='number'
                          id='height'
                          placeholder={t("height.placeholder")}
                        />
                      </Field>
                    )}
                  </form.Field>

                  <form.Field name='fitnessGoals'>
                    {(field) => (
                      <Field>
                        <FieldLabel htmlFor='fitnessGoals'>
                          {t("fitness_goals.label")}
                        </FieldLabel>
                        <Textarea
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
                        <FieldLabel htmlFor='certifications'>
                          {t("certifications.label")}
                        </FieldLabel>
                        <Input
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
                        <FieldLabel htmlFor='specializations'>
                          {t("specializations.label")}
                        </FieldLabel>
                        <Input
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
          className='w-full rounded-none px-4 py-2 font-mono text-xs uppercase tracking-[0.18em]'
        >
          {isLoading ? (
            <>
              <Spinner /> {t("submitting")}
            </>
          ) : (
            t("submit")
          )}
        </Button>

        <p className='mt-4 text-center text-sm text-muted-foreground'>
          {t("has_account")}{" "}
          <a
            href={ROUTES.LOGIN}
            className='font-mono text-xs font-medium uppercase tracking-[0.1em] text-primary underline decoration-primary/30 underline-offset-4 transition-colors hover:decoration-primary'
          >
            {t("sign_in")}
          </a>
        </p>
      </form>
    </div>
  )
}
