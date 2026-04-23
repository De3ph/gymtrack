'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from '@tanstack/react-form';
import { loginSchema, type LoginFormData } from '@/lib/validations/auth';
import { useAuthStore } from '@/stores/authStore';
import { ROUTES } from '@/lib/routes';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { FieldInfo } from '@/components/ui/form-field';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
    } satisfies LoginFormData,
    onSubmit: async ({ value }) => {
      setIsLoading(true)
      setError("")

      try {
        const user = await login(value.email, value.password)

        // Add a small delay to ensure tokens are persisted in localStorage
        await new Promise((resolve) => setTimeout(resolve, 100))

        // Redirect based on user role
        if (user?.role === "athlete") {
          router.push(ROUTES.ATHLETE_WORKOUTS)
        } else if (user?.role === "trainer") {
          router.push(ROUTES.TRAINER_CLIENTS)
        } else {
          router.push(ROUTES.PROFILE)
        }
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : "Login failed. Please try again."
        setError(errorMessage)
      } finally {
        setIsLoading(false)
      }
    },
  });

  return (
    <div className="rounded-lg bg-white p-8 shadow-xl dark:bg-gray-800">
      <h2 className="mb-6 text-2xl font-semibold text-gray-900 dark:text-white">
        Login to Your Account
      </h2>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
        className="space-y-4"
      >
        <form.Field
          name="email"
          validators={{
            onChange: ({ value }) => {
              if (!value || value.trim().length === 0) {
                return "Email is required"
              }
              if (!/^[\S]+@[\S]+\.[\S]+$/.test(value)) {
                return "Invalid email address"
              }
              return undefined
            },
          }}
        >
          {(field) => (
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                type="email"
                id="email"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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
                return "Password is required"
              }
              if (value.length < 6) {
                return "Password must be at least 6 characters"
              }
              return undefined
            },
          }}
        >
          {(field) => (
            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                type="password"
                id="password"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
              <FieldInfo field={field} />
            </Field>
          )}
        </form.Field>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-md bg-indigo-600 px-4 py-2 text-white font-semibold shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
        Don&apos;t have an account?{' '}
        <a
          href={ROUTES.REGISTER}
          className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
        >
          Sign up
        </a>
      </p>
    </div>
  );
}
