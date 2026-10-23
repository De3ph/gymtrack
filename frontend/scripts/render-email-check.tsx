 
import { render } from "react-email";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import ResetPasswordEmail from "../emails/reset-password";

async function main() {
  const outDir = resolve(__dirname, ".email-out");
  mkdirSync(outDir, { recursive: true });

  // The HTML and plain-text renders are independent: neither reads the other's
  // result, so they can run concurrently instead of one after the other.
  const [html, text] = await Promise.all([
    render(
      <ResetPasswordEmail resetUrl="https://gymtrack.app/reset-password?token=dGhpcy1pcy1hLXRlc3QtdG9rZW4" />,
    ),
    render(
      <ResetPasswordEmail resetUrl="https://gymtrack.app/reset-password?token=dGhpcy1pcy1hLXRlc3QtdG9rZW4" />,
      { plainText: true },
    ),
  ]);

  writeFileSync(resolve(outDir, "reset-password.html"), html);
  writeFileSync(resolve(outDir, "reset-password.txt"), text);
  console.log(`HTML: ${html.length} chars`);
  console.log(`Text: ${text.length} chars`);
  console.log("--- plain text preview ---");
  console.log(text);
}

void main();

