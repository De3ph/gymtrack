'use server'

import { revalidateTag } from 'next/cache'

export async function revalidateTrainerProfileCache() {
  revalidateTag('trainer-profile')
}

export async function revalidateWorkoutPlansCache() {
  revalidateTag('workout-plans')
}

export async function revalidateBodyMeasurementsCache() {
  revalidateTag('body-measurements')
  revalidateTag('latest-body-measurement')
}

export async function revalidateAdminStatsCache() {
  revalidateTag('admin-stats')
}
