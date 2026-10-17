/**
 * Form data shapes for the auth screens.
 *
 * These shapes used to be inferred from Zod schemas in this file, but no schema
 * here is ever parsed: every auth form validates inline through TanStack Form's
 * per-field validators so the messages can come from next-intl. Only the shapes
 * survived the migration, so only the shapes remain.
 */

export interface LoginFormData {
  identifier: string;
  password: string;
}

export interface ForgotPasswordFormData {
  email: string;
}