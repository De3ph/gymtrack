'use server'

import { revalidateTag } from 'next/cache'

export async function revalidateTrainerProfileCache() {
  revalidateTag('trainer-profile', 'max')
}

export async function revalidateWorkoutPlansCache() {
  revalidateTag('workout-plans', 'max')
}

export async function revalidateBodyMeasurementsCache() {
  revalidateTag('body-measurements', 'max')
  revalidateTag('latest-body-measurement', 'max')
}

export async function revalidateAdminStatsCache() {
  revalidateTag('admin-stats', 'max')
}
