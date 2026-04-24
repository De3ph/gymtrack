'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from '@tanstack/react-form';
import { userApi } from '@/lib/api';
import { relationshipApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import type { User, UserProfile } from '@/types';
import { AcceptInvitationDialog } from '@/components/features/athlete/AcceptInvitationDialog';
import { MyTrainerButton } from '@/components/features/athlete/MyTrainerButton';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel } from '@/components/ui/field';
import { FieldInfo } from '@/components/ui/form-field';

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

  const form = useForm({
    defaultValues: {
      name: currentUser?.profile?.name || '',
      age: currentUser?.profile?.age?.toString() || '',
      weight: currentUser?.profile?.weight?.toString() || '',
      height: currentUser?.profile?.height?.toString() || '',
      fitnessGoals: currentUser?.profile?.fitnessGoals || '',
      certifications: currentUser?.profile?.certifications || '',
      specializations: currentUser?.profile?.specializations || '',
    },
    onSubmit: async ({ value }) => {
      const profile: UserProfile = {
        name: value.name,
        age: value.age ? Number(value.age) : undefined,
        weight: value.weight ? Number(value.weight) : undefined,
        height: value.height ? Number(value.height) : undefined,
        fitnessGoals: value.fitnessGoals,
        certifications: value.certifications,
        specializations: value.specializations,
      };
      updateMutation.mutate({ profile });
    },
  });

  const handleCancel = () => {
    form.reset();
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
      <div className="rounded-lg bg-card p-8 shadow">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-card-foreground">
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
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Edit Profile
              </button>
            )}
          </div>
        </div>

        {updateMutation.isError && (
          <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            Failed to update profile. Please try again.
          </div>
        )}

        {!isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground">
                Email
              </label>
              <p className="mt-1 text-foreground">{currentUser.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground">
                Role
              </label>
              <p className="mt-1 capitalize text-foreground">
                {currentUser.role}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground">
                Name
              </label>
              <p className="mt-1 text-foreground">
                {currentUser.profile.name}
              </p>
            </div>

            {currentUser.role === 'athlete' ? (
              <>
                {currentUser.profile.age ? (
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground">
                      Age
                    </label>
                    <p className="mt-1 text-foreground">
                      {currentUser.profile.age}
                    </p>
                  </div>
                ) : null}
                {currentUser.profile.weight ? (
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground">
                      Weight
                    </label>
                    <p className="mt-1 text-foreground">
                      {currentUser.profile.weight} kg
                    </p>
                  </div>
                ) : null}
                {currentUser.profile.height ? (
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground">
                      Height
                    </label>
                    <p className="mt-1 text-foreground">
                      {currentUser.profile.height} cm
                    </p>
                  </div>
                ) : null}
                {currentUser.profile.fitnessGoals ? (
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground">
                      Fitness Goals
                    </label>
                    <p className="mt-1 text-foreground">
                      {currentUser.profile.fitnessGoals}
                    </p>
                  </div>
                ) : null}
              </>
            ) : null}

            {currentUser.role === 'trainer' ? (
              <>
                {currentUser.profile.certifications ? (
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground">
                      Certifications
                    </label>
                    <p className="mt-1 text-foreground">
                      {currentUser.profile.certifications}
                    </p>
                  </div>
                ) : null}
                {currentUser.profile.specializations ? (
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground">
                      Specializations
                    </label>
                    <p className="mt-1 text-foreground">
                      {currentUser.profile.specializations}
                    </p>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
            className="space-y-4"
          >
            <form.Field
              name="name"
              validators={{
                onChange: ({ value }) => {
                  if (!value || value.trim().length === 0) {
                    return 'Name is required';
                  }
                  return undefined;
                },
              }}
            >
              {(field) => (
                <Field>
                  <FieldLabel htmlFor="name">Full Name</FieldLabel>
                  <Input
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    type="text"
                    id="name"
                    className="mt-1 block w-full rounded-md border border-input px-3 py-2 shadow-sm focus:border-ring focus:outline-none focus:ring-ring"
                  />
                  <FieldInfo field={field} />
                </Field>
              )}
            </form.Field>

            {currentUser.role === 'athlete' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <form.Field name="age">
                    {(field) => (
                      <Field>
                        <FieldLabel htmlFor="age">Age</FieldLabel>
                        <Input
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                          type="number"
                          id="age"
                          className="mt-1 block w-full rounded-md border border-input px-3 py-2 shadow-sm focus:border-ring focus:outline-none focus:ring-ring"
                        />
                      </Field>
                    )}
                  </form.Field>
                  <form.Field name="weight">
                    {(field) => (
                      <Field>
                        <FieldLabel htmlFor="weight">Weight (kg)</FieldLabel>
                        <Input
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                          type="number"
                          id="weight"
                          className="mt-1 block w-full rounded-md border border-input px-3 py-2 shadow-sm focus:border-ring focus:outline-none focus:ring-ring"
                        />
                      </Field>
                    )}
                  </form.Field>
                </div>

                <form.Field name="height">
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor="height">Height (cm)</FieldLabel>
                      <Input
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        type="number"
                        id="height"
                        className="mt-1 block w-full rounded-md border border-input px-3 py-2 shadow-sm focus:border-ring focus:outline-none focus:ring-ring"
                      />
                    </Field>
                  )}
                </form.Field>

                <form.Field name="fitnessGoals">
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor="fitnessGoals">Fitness Goals</FieldLabel>
                      <textarea
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        id="fitnessGoals"
                        rows={3}
                        className="mt-1 block w-full rounded-md border border-input px-3 py-2 shadow-sm focus:border-ring focus:outline-none focus:ring-ring"
                      />
                    </Field>
                  )}
                </form.Field>
              </>
            )}

            {currentUser.role === 'trainer' && (
              <>
                <form.Field name="certifications">
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor="certifications">Certifications</FieldLabel>
                      <Input
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        type="text"
                        id="certifications"
                        className="mt-1 block w-full rounded-md border border-input px-3 py-2 shadow-sm focus:border-ring focus:outline-none focus:ring-ring"
                      />
                    </Field>
                  )}
                </form.Field>

                <form.Field name="specializations">
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor="specializations">Specializations</FieldLabel>
                      <Input
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        type="text"
                        id="specializations"
                        className="mt-1 block w-full rounded-md border border-input px-3 py-2 shadow-sm focus:border-ring focus:outline-none focus:ring-ring"
                      />
                    </Field>
                  )}
                </form.Field>
              </>
            )}

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="flex-1 rounded-md bg-primary px-4 py-2 text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 rounded-md border border-input px-4 py-2 text-foreground font-semibold hover:bg-muted"
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
