"use client"

import { authApi } from "@/lib/api"
import { registerSchema, type RegisterFormData } from "@/lib/validations/auth"
import { useAuthStore } from "@/stores/authStore"
import type { UserRole } from "@/types"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"

export default function RegisterPage() {
  const router = useRouter()
  const { login } = useAuthStore()
  const [error, setError] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: "athlete",
      profile: {
        name: "",
        age: undefined,
        weight: undefined,
        height: undefined
      }
    }
  } as const)

  const selectedRole = watch("role") as UserRole

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true)
    setError("")

    try {
      // Register user
      await authApi.register({
        email: data.email,
        password: data.password,
        role: data.role,
        profile: data.profile
      })

      // Auto-login after registration
      await login(data.email, data.password)
      router.push("/")
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Registration failed. Please try again."
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const onError = (formErrors: unknown) => {
    console.log("🚀 ~ RegisterPage ~ formErrors:", formErrors)
  }

  return (
    <div className='rounded-lg bg-white p-8 shadow-xl dark:bg-gray-800'>
      <h2 className='mb-6 text-2xl font-semibold text-gray-900 dark:text-white'>
        Create Your Account
      </h2>

      {error && (
        <div className='mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400'>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit, onError)} className='space-y-4'>
        <div>
          <label
            htmlFor='email'
            className='block text-sm font-medium text-gray-700 dark:text-gray-300'
          >
            Email
          </label>
          <input
            {...register("email")}
            type='email'
            id='email'
            className='mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white'
          />
          {errors.email && (
            <p className='mt-1 text-sm text-red-600 dark:text-red-400'>
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor='password'
            className='block text-sm font-medium text-gray-700 dark:text-gray-300'
          >
            Password
          </label>
          <input
            {...register("password")}
            type='password'
            id='password'
            className='mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white'
          />
          {errors.password && (
            <p className='mt-1 text-sm text-red-600 dark:text-red-400'>
              {errors.password.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor='confirmPassword'
            className='block text-sm font-medium text-gray-700 dark:text-gray-300'
          >
            Confirm Password
          </label>
          <input
            {...register("confirmPassword")}
            type='password'
            id='confirmPassword'
            className='mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white'
          />
          {errors.confirmPassword && (
            <p className='mt-1 text-sm text-red-600 dark:text-red-400'>
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <div>
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
            I am a
          </label>
          <div className='flex gap-4'>
            <label className='flex items-center'>
              <input
                {...register("role")}
                type='radio'
                value='athlete'
                className='mr-2'
              />
              <span className='text-gray-700 dark:text-gray-300'>Athlete</span>
            </label>
            <label className='flex items-center'>
              <input
                {...register("role")}
                type='radio'
                value='trainer'
                className='mr-2'
              />
              <span className='text-gray-700 dark:text-gray-300'>Trainer</span>
            </label>
          </div>
          {errors.role && (
            <p className='mt-1 text-sm text-red-600 dark:text-red-400'>
              {errors.role.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor='name'
            className='block text-sm font-medium text-gray-700 dark:text-gray-300'
          >
            Full Name
          </label>
          <input
            {...register("profile.name")}
            type='text'
            id='name'
            className='mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white'
          />
          {errors.profile?.name && (
            <p className='mt-1 text-sm text-red-600 dark:text-red-400'>
              {errors.profile.name.message}
            </p>
          )}
        </div>

        {selectedRole === "athlete" && (
          <>
            <div className='grid grid-cols-2 gap-4'>
              <div>
                <label
                  htmlFor='age'
                  className='block text-sm font-medium text-gray-700 dark:text-gray-300'
                >
                  Age (optional)
                </label>
                <input
                  {...register("profile.age", {
                    valueAsNumber: true,
                    required: false
                  })}
                  type='number'
                  id='age'
                  className='mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white'
                />
              </div>
              <div>
                <label
                  htmlFor='weight'
                  className='block text-sm font-medium text-gray-700 dark:text-gray-300'
                >
                  Weight (kg, optional)
                </label>
                <input
                  {...register("profile.weight", {
                    valueAsNumber: true,
                    required: false
                  })}
                  type='number'
                  id='weight'
                  className='mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white'
                />
              </div>
            </div>

            <div>
              <label
                htmlFor='height'
                className='block text-sm font-medium text-gray-700 dark:text-gray-300'
              >
                Height (cm, optional)
              </label>
              <input
                {...register("profile.height", {
                  valueAsNumber: true,
                  required: false
                })}
                type='number'
                id='height'
                className='mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white'
              />
            </div>

            <div>
              <label
                htmlFor='fitnessGoals'
                className='block text-sm font-medium text-gray-700 dark:text-gray-300'
              >
                Fitness Goals (optional)
              </label>
              <textarea
                {...register("profile.fitnessGoals", { required: false })}
                id='fitnessGoals'
                rows={3}
                className='mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white'
              />
            </div>
          </>
        )}

        {selectedRole === "trainer" && (
          <>
            <div>
              <label
                htmlFor='certifications'
                className='block text-sm font-medium text-gray-700 dark:text-gray-300'
              >
                Certifications (optional)
              </label>
              <input
                {...register("profile.certifications")}
                type='text'
                id='certifications'
                placeholder='e.g., NASM CPT, ACE'
                className='mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white'
              />
            </div>

            <div>
              <label
                htmlFor='specializations'
                className='block text-sm font-medium text-gray-700 dark:text-gray-300'
              >
                Specializations (optional)
              </label>
              <input
                {...register("profile.specializations")}
                type='text'
                id='specializations'
                placeholder='e.g., Strength Training, Nutrition'
                className='mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white'
              />
            </div>
          </>
        )}

        <button
          type='submit'
          disabled={isLoading}
          className='w-full rounded-md bg-indigo-600 px-4 py-2 text-white font-semibold shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
        >
          {isLoading ? "Creating account..." : "Sign Up"}
        </button>
      </form>

      <p className='mt-4 text-center text-sm text-gray-600 dark:text-gray-400'>
        Already have an account?{" "}
        <a
          href='/login'
          className='font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400'
        >
          Login
        </a>
      </p>
    </div>
  )
}
