/**
 * env.ts / server-env.ts read process.env at module load, so every case uses
 * vi.stubEnv + vi.resetModules + a fresh dynamic import.
 *
 * `server-only` throws when imported outside a React Server Component context,
 * so it is stubbed to let server-env.ts load under Vitest.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

async function loadEnv() {
  vi.resetModules();
  return await import("@/lib/env");
}

async function loadServerEnv() {
  vi.resetModules();
  return await import("@/lib/server-env");
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("env production validation", () => {
  it("accepts the recommended relative /api value", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "/api");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://app.example.com");
    vi.stubEnv("INTERNAL_API_URL", "http://backend:8080/api");

    const env = await loadEnv();
    expect(env.API_URL).toBe("/api");

    const serverEnv = await loadServerEnv();
    expect(serverEnv.INTERNAL_API_URL).toBe("http://backend:8080/api");
  });

  it("accepts an absolute https API URL", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com/api");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://app.example.com");

    const env = await loadEnv();
    expect(env.API_URL).toBe("https://api.example.com/api");

    // Absolute public URL doubles as the server-side base.
    const serverEnv = await loadServerEnv();
    expect(serverEnv.INTERNAL_API_URL).toBe("https://api.example.com/api");
  });

  it("rejects a non-loopback http:// API URL in production (upgrade-insecure-requests would break it)", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.example.com/api");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://app.example.com");

    await expect(loadEnv()).rejects.toThrow(
      /NEXT_PUBLIC_API_URL must use https:\/\/ in production/,
    );
  });

  it("rejects a non-loopback http:// SITE URL in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "/api");
    vi.stubEnv("INTERNAL_API_URL", "http://backend:8080/api");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://app.example.com");

    await expect(loadEnv()).rejects.toThrow(
      /NEXT_PUBLIC_SITE_URL must use https:\/\/ in production/,
    );
  });

  it("allows loopback http:// for local smoke tests of a production build", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8080/api");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://127.0.0.1:3000");

    const env = await loadEnv();
    expect(env.API_URL).toBe("http://localhost:8080/api");
    expect(env.SITE_URL).toBe("http://127.0.0.1:3000");
  });

  it("fails fast when a required production var is missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://app.example.com");

    await expect(loadEnv()).rejects.toThrow(
      /NEXT_PUBLIC_API_URL is required in production/,
    );
  });

  it("requires INTERNAL_API_URL in production when API_URL is relative", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "/api");
    vi.stubEnv("INTERNAL_API_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://app.example.com");

    await expect(loadServerEnv()).rejects.toThrow(
      /INTERNAL_API_URL is required in production/,
    );
  });

  it("does not require server-only vars: env.ts stays importable in the client bundle", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "/api");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://app.example.com");
    // In the browser bundle INTERNAL_API_URL is `undefined` — copied into the
    // client via lib/api/api-client.ts, env.ts must not throw on it.
    vi.stubEnv("INTERNAL_API_URL", "");

    await expect(loadEnv()).resolves.toMatchObject({ API_URL: "/api" });
  });
});

describe("env development fallbacks", () => {
  it("keeps zero-config localhost defaults", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("INTERNAL_API_URL", "");

    const env = await loadEnv();
    expect(env.API_URL).toBe("http://localhost:8080/api");
    expect(env.SITE_URL).toBe("http://localhost:3000");

    const serverEnv = await loadServerEnv();
    expect(serverEnv.INTERNAL_API_URL).toBe("http://localhost:8080/api");
  });

  it("does not enforce https on absolute URLs", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8080/api");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");

    const env = await loadEnv();
    expect(env.API_URL).toBe("http://localhost:8080/api");
  });
});
