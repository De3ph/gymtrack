'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { userApi } from '@/lib/api';
import { relationshipApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { athleteProfileSchema, trainerProfileSchema } from '@/lib/validations/auth';
import type { User, UserProfile } from '@/types';
import { AcceptInvitationDialog } from '@/components/features/athlete/AcceptInvitationDialog';
import { MyTrainerButton } from '@/components/features/athlete/MyTrainerButton';

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const queryClient = useQueryClient();

  const { data: currentUser, isLoading } = useQuery<User>({
    queryKey: ['currentUser'],
    queryFn: userApi.getCurrentUser,
    initialData: user || undefined,
  });

  const { data: trainerData } = useQuery({
    queryKey: ['myTrainer'],
    queryFn: relationshipApi.getMyTrainer,
    enabled: currentUser?.role === 'athlete',
  });

  const updateMutation = useMutation({
    mutationFn: userApi.updateCurrentUser,
    onSuccess: (data) => {
      queryClient.setQueryData(['currentUser'], data);
      setUser(data);
      setIsEditing(false);
    },
  });

  const schema = currentUser?.role === 'athlete' ? athleteProfileSchema : trainerProfileSchema;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<UserProfile>({
    resolver: zodResolver(schema),
    defaultValues: currentUser?.profile,
  });

  const onSubmit = (data: UserProfile) => {
    updateMutation.mutate({ profile: data });
  };

  const handleCancel = () => {
    reset(currentUser?.profile);
    setIsEditing(false);
  };

  if (isLoading) {
    return <div className="text-center">Loading profile...</div>;
  }

  if (!currentUser) {
    return <div className="text-center">User not found</div>;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-lg bg-white p-8 shadow dark:bg-gray-800">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            My Profile
          </h2>
          <div className="flex items-center gap-2">
            {currentUser?.role === 'athlete' && (
              <>
                {trainerData?.activeTrainer ? (
                  <MyTrainerButton />
                ) : (
                  <AcceptInvitationDialog />
                )}
              </>
            )}
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Edit Profile
              </button>
            )}
          </div>
        </div>

        {updateMutation.isError && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
            Failed to update profile. Please try again.
          </div>
        )}

        {!isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                Email
              </label>
              <p className="mt-1 text-gray-900 dark:text-white">{currentUser.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                Role
              </label>
              <p className="mt-1 capitalize text-gray-900 dark:text-white">
                {currentUser.role}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                Name
              </label>
              <p className="mt-1 text-gray-900 dark:text-white">
                {currentUser.profile.name}
              </p>
            </div>

            {currentUser.role === 'athlete' && (
              <>
                {currentUser.profile.age && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                      Age
                    </label>
                    <p className="mt-1 text-gray-900 dark:text-white">
                      {currentUser.profile.age}
                    </p>
                  </div>
                )}
                {currentUser.profile.weight && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                      Weight
                    </label>
                    <p className="mt-1 text-gray-900 dark:text-white">
                      {currentUser.profile.weight} kg
                    </p>
                  </div>
                )}
                {currentUser.profile.height && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                      Height
                    </label>
                    <p className="mt-1 text-gray-900 dark:text-white">
                      {currentUser.profile.height} cm
                    </p>
                  </div>
                )}
                {currentUser.profile.fitnessGoals && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                      Fitness Goals
                    </label>
                    <p className="mt-1 text-gray-900 dark:text-white">
                      {currentUser.profile.fitnessGoals}
                    </p>
                  </div>
                )}
              </>
            )}

            {currentUser.role === 'trainer' && (
              <>
                {currentUser.profile.certifications && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                      Certifications
                    </label>
                    <p className="mt-1 text-gray-900 dark:text-white">
                      {currentUser.profile.certifications}
                    </p>
                  </div>
                )}
                {currentUser.profile.specializations && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                      Specializations
                    </label>
                    <p className="mt-1 text-gray-900 dark:text-white">
                      {currentUser.profile.specializations}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Full Name
              </label>
              <input
                {...register('name')}
                type="text"
                id="name"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.name.message}
                </p>
              )}
            </div>

            {currentUser.role === 'athlete' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="age"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Age
                    </label>
                    <input
                      {...register('age', { valueAsNumber: true })}
                      type="number"
                      id="age"
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="weight"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Weight (kg)
                    </label>
                    <input
                      {...register('weight', { valueAsNumber: true })}
                      type="number"
                      id="weight"
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="height"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Height (cm)
                  </label>
                  <input
                    {...register('height', { valueAsNumber: true })}
                    type="number"
                    id="height"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label
                    htmlFor="fitnessGoals"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Fitness Goals
                  </label>
                  <textarea
                    {...register('fitnessGoals')}
                    id="fitnessGoals"
                    rows={3}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </>
            )}

            {currentUser.role === 'trainer' && (
              <>
                <div>
                  <label
                    htmlFor="certifications"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Certifications
                  </label>
                  <input
                    {...register('certifications')}
                    type="text"
                    id="certifications"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label
                    htmlFor="specializations"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Specializations
                  </label>
                  <input
                    {...register('specializations')}
                    type="text"
                    id="specializations"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </>
            )}

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="flex-1 rounded-md bg-indigo-600 px-4 py-2 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-gray-700 font-semibold hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
