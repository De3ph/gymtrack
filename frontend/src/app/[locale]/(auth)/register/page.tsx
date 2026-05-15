"use client"

import { authApi } from "@/lib/api"
import { useAuthStore } from "@/stores/authStore"
import type { UserRole } from "@/types"
import { useRouter, usePathname } from '@/i18n/navigation'
import { useState } from "react"
import { useForm } from "@tanstack/react-form"
import { ROUTES } from "@/lib/routes"
import { Input } from '@/components/ui/input';
import { Field, FieldLabel } from '@/components/ui/field';
import { FieldInfo } from '@/components/ui/form-field';
import { useTranslations } from 'next-intl';

export default function RegisterPage() {
  const router = useRouter()
  const { login } = useAuthStore()
  const [error, setError] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const t = useTranslations('auth.register')
  const tCommon = useTranslations('common')

  const form = useForm({
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "athlete" as UserRole,
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
          role: value.role,
          profile
        })

        // Auto-login after registration
        await login(value.email, value.password)
        router.push(ROUTES.HOME)
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Registration failed. Please try again."
        setError(errorMessage)
      } finally {
        setIsLoading(false)
      }
    },
  })

  const selectedRole = form.getFieldValue("role") as UserRole

  return (
    <div className='rounded-lg bg-card p-8 shadow-xl'>
      <h2 className='mb-6 text-2xl font-semibold text-card-foreground'>
        {t('title')}
      </h2>

      {error && (
        <div className='mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive'>
          {error}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
        className='space-y-4'
      >
        <form.Field
          name="username"
          validators={{
            onChange: ({ value }) => {
              if (!value || value.trim().length === 0) {
                return t('username.error.required')
              }
              if (value.length < 3) {
                return t('username.error.min_length')
              }
              if (value.length > 30) {
                return t('username.error.max_length')
              }
              if (!/^[a-zA-Z0-9]+$/.test(value)) {
                return t('username.error.invalid')
              }
              return undefined
            },
          }}
        >
          {(field) => (
            <Field>
              <FieldLabel htmlFor='username'>{t('username.label')}</FieldLabel>
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                type='text'
                id='username'
                placeholder={t('username.placeholder')}
                className='mt-1 block w-full rounded-md border border-input px-3 py-2 shadow-sm focus:border-ring focus:outline-none focus:ring-ring'
              />
              <FieldInfo field={field} />
            </Field>
          )}
        </form.Field>

        <form.Field
          name="email"
          validators={{
            onChange: ({ value }) => {
              if (!value || value.trim().length === 0) {
                return t('email.error.required')
              }
              if (!/^[\S]+@[\S]+\.[\S]+$/.test(value)) {
                return t('email.error.invalid')
              }
              return undefined
            },
          }}
        >
          {(field) => (
            <Field>
              <FieldLabel htmlFor='email'>{t('email.label')}</FieldLabel>
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                type='email'
                id='email'
                placeholder={t('email.placeholder')}
                className='mt-1 block w-full rounded-md border border-input px-3 py-2 shadow-sm focus:border-ring focus:outline-none focus:ring-ring'
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
                return t('password.error.required')
              }
              if (value.length < 6) {
                return t('password.error.min_length')
              }
              return undefined
            },
          }}
        >
          {(field) => (
            <Field>
              <FieldLabel htmlFor='password'>{t('password.label')}</FieldLabel>
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                type='password'
                id='password'
                placeholder={t('password.placeholder')}
                className='mt-1 block w-full rounded-md border border-input px-3 py-2 shadow-sm focus:border-ring focus:outline-none focus:ring-ring'
              />
              <FieldInfo field={field} />
            </Field>
          )}
        </form.Field>

        <form.Field
          name="confirmPassword"
          validators={{
            onChange: ({ value, fieldApi }) => {
              const password = fieldApi.form.state.values.password
              if (!value || value.length === 0) {
                return t('confirm_password.error.required')
              }
              if (value !== password) {
                return t('confirm_password.error.mismatch')
              }
              return undefined
            },
          }}
        >
          {(field) => (
            <Field>
              <FieldLabel htmlFor='confirmPassword'>{t('confirm_password.label')}</FieldLabel>
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                type='password'
                id='confirmPassword'
                placeholder={t('confirm_password.placeholder')}
                className='mt-1 block w-full rounded-md border border-input px-3 py-2 shadow-sm focus:border-ring focus:outline-none focus:ring-ring'
              />
              <FieldInfo field={field} />
            </Field>
          )}
        </form.Field>

        <form.Field name="role">
          {(field) => (
            <Field>
              <FieldLabel>{t('role.label')}</FieldLabel>
              <div className='flex gap-4'>
                <label className='flex items-center'>
                  <input
                    type='radio'
                    checked={field.state.value === 'athlete'}
                    onChange={() => field.handleChange('athlete')}
                    className='mr-2'
                  />
                  <span className='text-foreground'>{t('role.athlete')}</span>
                </label>
                <label className='flex items-center'>
                  <input
                    type='radio'
                    checked={field.state.value === 'trainer'}
                    onChange={() => field.handleChange('trainer')}
                    className='mr-2'
                  />
                  <span className='text-foreground'>{t('role.trainer')}</span>
                </label>
              </div>
            </Field>
          )}
        </form.Field>

        <form.Field
          name="name"
          validators={{
            onChange: ({ value }) => {
              if (!value || value.trim().length === 0) {
                return t('name.error.required')
              }
              return undefined
            },
          }}
        >
          {(field) => (
            <Field>
              <FieldLabel htmlFor='name'>{t('name.label')}</FieldLabel>
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                type='text'
                id='name'
                placeholder={t('name.placeholder')}
                className='mt-1 block w-full rounded-md border border-input px-3 py-2 shadow-sm focus:border-ring focus:outline-none focus:ring-ring'
              />
              <FieldInfo field={field} />
            </Field>
          )}
        </form.Field>

        {selectedRole === "athlete" && (
          <>
            <div className='grid grid-cols-2 gap-4'>
              <form.Field name="age">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor='age'>{t('age.label')}</FieldLabel>
                    <Input
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      type='number'
                      id='age'
                      placeholder={t('age.placeholder')}
                      className='mt-1 block w-full rounded-md border border-input px-3 py-2 shadow-sm focus:border-ring focus:outline-none focus:ring-ring'
                    />
                  </Field>
                )}
              </form.Field>
              <form.Field name="weight">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor='weight'>{t('weight.label')}</FieldLabel>
                    <Input
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      type='number'
                      id='weight'
                      placeholder={t('weight.placeholder')}
                      className='mt-1 block w-full rounded-md border border-input px-3 py-2 shadow-sm focus:border-ring focus:outline-none focus:ring-ring'
                    />
                  </Field>
                )}
              </form.Field>
            </div>

            <form.Field name="height">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor='height'>{t('height.label')}</FieldLabel>
                  <Input
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    type='number'
                    id='height'
                    placeholder={t('height.placeholder')}
                    className='mt-1 block w-full rounded-md border border-input px-3 py-2 shadow-sm focus:border-ring focus:outline-none focus:ring-ring'
                  />
                </Field>
              )}
            </form.Field>

            <form.Field name="fitnessGoals">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor='fitnessGoals'>{t('fitness_goals.label')}</FieldLabel>
                  <textarea
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    id='fitnessGoals'
                    placeholder={t('fitness_goals.placeholder')}
                    rows={3}
                    className='mt-1 block w-full rounded-md border border-input px-3 py-2 shadow-sm focus:border-ring focus:outline-none focus:ring-ring'
                  />
                </Field>
              )}
            </form.Field>
          </>
        )}

        {selectedRole === "trainer" && (
          <>
            <form.Field name="certifications">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor='certifications'>{t('certifications.label')}</FieldLabel>
                  <Input
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    type='text'
                    id='certifications'
                    placeholder={t('certifications.placeholder')}
                    className='mt-1 block w-full rounded-md border border-input px-3 py-2 shadow-sm focus:border-ring focus:outline-none focus:ring-ring'
                  />
                </Field>
              )}
            </form.Field>

            <form.Field name="specializations">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor='specializations'>{t('specializations.label')}</FieldLabel>
                  <Input
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    type='text'
                    id='specializations'
                    placeholder={t('specializations.placeholder')}
                    className='mt-1 block w-full rounded-md border border-input px-3 py-2 shadow-sm focus:border-ring focus:outline-none focus:ring-ring'
                  />
                </Field>
              )}
            </form.Field>
          </>
        )}
        <button
          type='submit'
          disabled={isLoading}
          className='w-full rounded-md bg-primary px-4 py-2 text-primary-foreground font-semibold shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
        >
          {isLoading ? t('submitting') : t('submit')}
        </button>

        <p className='mt-4 text-center text-sm text-muted-foreground'>
          {t('has_account')}{' '}
          <a
            href={ROUTES.LOGIN}
            className='font-medium text-primary hover:text-primary/80'
          >
            {t('sign_in')}
          </a>
        </p>
      </form>
    </div>
  )
}

