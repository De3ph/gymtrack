import { createHmac } from "crypto";
import { readFileSync } from "fs";
import { join } from "path";
import type { Page, BrowserContext } from "@playwright/test";

const SESSION_COOKIE_NAME = "session";
const REFRESH_COOKIE_NAME = "refresh_token";

export const mockUsers = {
  athlete: {
    userId: 1,
    email: "athlete@test.com",
    username: "testathlete",
    role: "athlete",
    profile: { name: "Test Athlete" },
  },
  trainer: {
    userId: 2,
    email: "trainer@test.com",
    username: "testtrainer",
    role: "trainer",
    profile: { name: "Test Trainer" },
  },
  admin: {
    userId: 3,
    email: "admin@test.com",
    username: "testadmin",
    role: "admin",
    profile: { name: "Test Admin" },
  },
} as const;

function getSessionSecret(): string {
  try {
    const envPath = join(process.cwd(), ".env.local");
    const content = readFileSync(envPath, "utf8");
    const match = content.match(/^SESSION_SECRET=(.+)$/m);
    if (match) return match[1].trim().replace(/^['"]|['"]$/g, "");
  } catch {
    // .env.local not found — fall through to env var
  }
  const envSecret = process.env.SESSION_SECRET;
  if (envSecret) return envSecret;
  throw new Error("SESSION_SECRET not found in .env.local or environment");
}

function base64urlEncode(data: string): string {
  return Buffer.from(data, "utf8").toString("base64url");
}

// Manually sign HS256 JWT — compatible with jose jwtVerify in lib/session.ts.
// Avoids ESM/CJS interop issues importing jose from the Playwright runner.
export function createSessionCookie(role: string, userId: string = "1"): string {
  const secret = getSessionSecret();
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const header = { alg: "HS256" };
  const payload = {
    userId,
    role,
    accessToken: "mock-access-token",
    expiresAt: expiresAt.toISOString(),
    iat: now,
    exp: now + 7 * 24 * 60 * 60,
  };
  const encHeader = base64urlEncode(JSON.stringify(header));
  const encPayload = base64urlEncode(JSON.stringify(payload));
  const signingInput = `${encHeader}.${encPayload}`;
  const signature = createHmac("sha256", Buffer.from(secret, "utf8"))
    .update(signingInput)
    .digest("base64url");
  return `${signingInput}.${signature}`;
}

export async function setSessionCookie(
  context: BrowserContext,
  role: string,
  userId: string = "1",
): Promise<void> {
  const sessionValue = createSessionCookie(role, userId);
  await context.addCookies([
    {
      name: SESSION_COOKIE_NAME,
      value: sessionValue,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
    {
      name: REFRESH_COOKIE_NAME,
      value: "mock-refresh-token",
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

function getUserForRole(role: string) {
  if (role === "trainer") return mockUsers.trainer;
  if (role === "admin") return mockUsers.admin;
  return mockUsers.athlete;
}

export async function mockGoBackend(
  page: Page,
  role: string = "athlete",
): Promise<void> {
  const user = getUserForRole(role);

  await page.route("**/api/auth/login", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        accessToken: "mock-access-token",
        refreshToken: "mock-refresh-token",
        user,
      }),
    });
  });

  await page.route("**/api/auth/register", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ message: "Registration successful" }),
    });
  });

  await page.route("**/api/auth/logout", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ message: "Logged out" }),
    });
  });

  await page.route("**/api/users/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(user),
    });
  });
}

export async function mockSessionRoute(
  page: Page,
  role: string = "athlete",
  userId: string = "1",
): Promise<void> {
  await page.route("**/api/auth/session", async (route) => {
    const method = route.request().method();
    if (method === "POST") {
      await setSessionCookie(page.context(), role, userId);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    } else if (method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: "mock-access-token",
          refreshToken: "mock-refresh-token",
          userId,
          role,
        }),
      });
    } else if (method === "DELETE") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    } else {
      await route.continue();
    }
  });
}

export async function setupAuthenticatedState(
  page: Page,
  role: string = "athlete",
): Promise<void> {
  const userId = role === "athlete" ? "1" : role === "trainer" ? "2" : "3";
  await setSessionCookie(page.context(), role, userId);
  await mockGoBackend(page, role);
  await mockSessionRoute(page, role, userId);
}

