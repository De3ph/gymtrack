'use server'

import { updateTag } from 'next/cache'

// `updateTag` is the Next 16 replacement for the deprecated single-argument
// `revalidateTag(tag)` form. Both expire the tagged entries immediately so the
// next read waits for fresh data — which is what these actions need, since each
// runs after a mutation and the user must see their own write. Unlike
// `revalidateTag`, `updateTag` may only be called from a Server Action, which
// every function in this file is (see the 'use server' directive above).

export async function revalidateTrainerProfileCache() {
  updateTag('trainer-profile')
}

export async function revalidateWorkoutPlansCache() {
  updateTag('workout-plans')
}

export async function revalidateBodyMeasurementsCache() {
  updateTag('body-measurements')
  updateTag('latest-body-measurement')
}

export async function revalidateAdminStatsCache() {
  updateTag('admin-stats')
}