/** Returns true if the item was created within the last 24 hours */
export function canEdit(createdAt?: string): boolean {
  if (!createdAt) return false;
  const created = new Date(createdAt).getTime();
  return Date.now() - created < 24 * 60 * 60 * 1000;
}
