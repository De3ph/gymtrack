import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
  pixelBasedPreset,
} from "react-email";

/**
 * Password reset email — GymTrack scoreboard register (frontend/DESIGN.md).
 *
 * DESIGN.md says "never hardcode hex values in components". That rule assumes
 * Tailwind can read the CSS variables from globals.css; email clients strip
 * <style> variables and custom properties, so the semantic token values are
 * mirrored here instead. If a token changes in globals.css (light theme),
 * update the matching value below.
 */

interface ResetPasswordEmailProps {
  resetUrl: string;
}

export default function ResetPasswordEmail({ resetUrl }: ResetPasswordEmailProps) {
  return (
    <Html lang="en">
      <Tailwind
        config={{
          presets: [pixelBasedPreset],
          theme: {
            extend: {
              colors: {
                background: "#fafaf9", // stone-50
                foreground: "#1c1917", // stone-900
                border: "#e7e5e4", // stone-200
                "muted-foreground": "#78716c", // stone-500
                primary: "#dc2626", // red-600
              },
              fontFamily: {
                sans: ["Inter", '"Helvetica Neue"', "Helvetica", "Arial", "sans-serif"],
                mono: [
                  '"Geist Mono"',
                  '"SF Mono"',
                  "Menlo",
                  "Consolas",
                  '"Courier New"',
                  "monospace",
                ],
              },
            },
          },
        }}
      >
        <Head />
        <Body className="bg-background py-10 font-sans">
          <Preview>
            Reset your GymTrack password. The link expires in 1 hour.
          </Preview>
          <Container className="mx-auto max-w-[520px] px-6">
            {/* Signal bar — mirrors the red bar above auth-page headings */}
            <div className="mb-8 h-1 w-12 bg-primary" />

            <p className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.35em] text-muted-foreground">
              Account
            </p>
            {/* Single h1; body copy in foreground/muted-foreground only */}
            <h1 className="m-0 font-mono text-2xl font-medium leading-tight tracking-[-0.04em] text-foreground">
              Reset password
            </h1>

            <Text className="mt-4 text-base font-medium leading-7 text-foreground">
              We received a request to reset your GymTrack password.
            </Text>

            <Button
              href={resetUrl}
              className="block w-full box-border bg-primary px-5 py-3 text-center font-mono text-xs font-medium uppercase tracking-[0.18em] text-white no-underline"
            >
              Reset password
            </Button>

            {/* Fallback URL — hairline panel, mono, square */}
            <Section className="mt-6 border border-solid border-border p-4">
              <p className="m-0 text-sm leading-6 text-muted-foreground">
                If the button doesn&apos;t work, paste this URL into your browser:
              </p>
              <p className="mb-0 mt-2 break-all font-mono text-xs leading-4 text-foreground">
                {resetUrl}
              </p>
            </Section>

            <Hr className="mt-8 border-solid border-border" />

            <Text className="mb-0 text-sm leading-6 text-muted-foreground">
              This link expires in 1 hour and can only be used once. If you
              didn&apos;t request a reset, you can safely ignore this email —
              your password stays unchanged.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

ResetPasswordEmail.PreviewProps = {
  resetUrl: "https://gymtrack.app/reset-password?token=dGhpcy1pcy1hLXRlc3QtdG9rZW4",
} satisfies ResetPasswordEmailProps;

