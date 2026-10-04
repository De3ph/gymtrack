/**
 * Items stay editable for 7 days after creation, mirroring the backend's
 * `models.BodyMeasurement.EditWindow`. Keep both in sync.
 */
const EDIT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/** Returns true if the item was created within the edit window. */
export function canEdit(createdAt?: string): boolean {
  if (!createdAt) return false;
  const created = new Date(createdAt).getTime();
  return Date.now() - created < EDIT_WINDOW_MS;
}
