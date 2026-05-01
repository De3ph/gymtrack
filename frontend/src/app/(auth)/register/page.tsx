"use client"

import { authApi } from "@/lib/api"
import { useAuthStore } from "@/stores/authStore"
import type { UserRole } from "@/types"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "@tanstack/react-form"
import { ROUTES } from "@/lib/routes"
import { Input } from '@/components/ui/input';
import { Field, FieldLabel } from '@/components/ui/field';
import { FieldInfo } from '@/components/ui/form-field';

export default function RegisterPage() {
  const router = useRouter()
  const { login } = useAuthStore()
  const [error, setError] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)

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
        Create Your Account
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
                return "Username is required"
              }
              if (value.length < 3) {
                return "Username must be at least 3 characters"
              }
              if (value.length > 30) {
                return "Username must be less than 30 characters"
              }
              if (!/^[a-zA-Z0-9]+$/.test(value)) {
                return "Username must contain only letters and numbers"
              }
              return undefined
            },
          }}
        >
          {(field) => (
            <Field>
              <FieldLabel htmlFor='username'>Username</FieldLabel>
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                type='text'
                id='username'
                placeholder='Choose a username'
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
              <FieldLabel htmlFor='email'>Email</FieldLabel>
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                type='email'
                id='email'
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
              <FieldLabel htmlFor='password'>Password</FieldLabel>
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                type='password'
                id='password'
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
                return "Please confirm your password"
              }
              if (value !== password) {
                return "Passwords do not match"
              }
              return undefined
            },
          }}
        >
          {(field) => (
            <Field>
              <FieldLabel htmlFor='confirmPassword'>Confirm Password</FieldLabel>
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                type='password'
                id='confirmPassword'
                className='mt-1 block w-full rounded-md border border-input px-3 py-2 shadow-sm focus:border-ring focus:outline-none focus:ring-ring'
              />
              <FieldInfo field={field} />
            </Field>
          )}
        </form.Field>

        <form.Field name="role">
          {(field) => (
            <Field>
              <FieldLabel>I am a</FieldLabel>
              <div className='flex gap-4'>
                <label className='flex items-center'>
                  <input
                    type='radio'
                    checked={field.state.value === 'athlete'}
                    onChange={() => field.handleChange('athlete')}
                    className='mr-2'
                  />
                  <span className='text-foreground'>Athlete</span>
                </label>
                <label className='flex items-center'>
                  <input
                    type='radio'
                    checked={field.state.value === 'trainer'}
                    onChange={() => field.handleChange('trainer')}
                    className='mr-2'
                  />
                  <span className='text-foreground'>Trainer</span>
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
                return "Name is required"
              }
              return undefined
            },
          }}
        >
          {(field) => (
            <Field>
              <FieldLabel htmlFor='name'>Full Name</FieldLabel>
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                type='text'
                id='name'
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
                    <FieldLabel htmlFor='age'>Age (optional)</FieldLabel>
                    <Input
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      type='number'
                      id='age'
                      className='mt-1 block w-full rounded-md border border-input px-3 py-2 shadow-sm focus:border-ring focus:outline-none focus:ring-ring'
                    />
                  </Field>
                )}
              </form.Field>
              <form.Field name="weight">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor='weight'>Weight (kg, optional)</FieldLabel>
                    <Input
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      type='number'
                      id='weight'
                      className='mt-1 block w-full rounded-md border border-input px-3 py-2 shadow-sm focus:border-ring focus:outline-none focus:ring-ring'
                    />
                  </Field>
                )}
              </form.Field>
            </div>

            <form.Field name="height">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor='height'>Height (cm, optional)</FieldLabel>
                  <Input
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    type='number'
                    id='height'
                    className='mt-1 block w-full rounded-md border border-input px-3 py-2 shadow-sm focus:border-ring focus:outline-none focus:ring-ring'
                  />
                </Field>
              )}
            </form.Field>

            <form.Field name="fitnessGoals">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor='fitnessGoals'>Fitness Goals (optional)</FieldLabel>
                  <textarea
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    id='fitnessGoals'
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
                  <FieldLabel htmlFor='certifications'>Certifications (optional)</FieldLabel>
                  <Input
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    type='text'
                    id='certifications'
                    placeholder='e.g., NASM CPT, ACE'
                    className='mt-1 block w-full rounded-md border border-input px-3 py-2 shadow-sm focus:border-ring focus:outline-none focus:ring-ring'
                  />
                </Field>
              )}
            </form.Field>

            <form.Field name="specializations">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor='specializations'>Specializations (optional)</FieldLabel>
                  <Input
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    type='text'
                    id='specializations'
                    placeholder='e.g., Strength Training, Nutrition'
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
          {isLoading ? "Creating account..." : "Sign Up"}
        </button>
      </form>

      <p className='mt-4 text-center text-sm text-muted-foreground'>
        Already have an account?{" "}
        <a
          href={ROUTES.LOGIN}
          className='font-medium text-primary hover:text-primary/80'
        >
          Login
        </a>
      </p>
    </div>
  )
}
