import { render } from "react-email";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import ResetPasswordEmail from "../emails/reset-password";

/**
 * Exports the reset-password email as static HTML for the Go backend.
 * The URL is emitted as a __RESET_URL__ placeholder that
 * backend/internal/infrastructure/email/resend.go substitutes at send time.
 * Run: pnpm email:export
 */
async function main() {
  const outPath = resolve(
    __dirname,
    "../../backend/internal/infrastructure/email/templates/reset_password.html",
  );
  mkdirSync(dirname(outPath), { recursive: true });

  const html = await render(<ResetPasswordEmail resetUrl="__RESET_URL__" />);
  writeFileSync(outPath, html);
  console.log(`written: ${outPath} (${html.length} chars)`);
}

void main();
