// DOM webview API client — runs inside 'use dom' components
// Has direct network access, receives token from native via props

let apiUrl = "http://localhost:8080/api";
let accessToken: string | null = null;

export function configureDomApi(config: { apiUrl?: string; token?: string | null }) {
  if (config.apiUrl) apiUrl = config.apiUrl;
  if (config.token !== undefined) accessToken = config.token;
}

export async function domFetch<T = unknown>(
  endpoint: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const { method = "GET", body } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${apiUrl}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
    throw new Error(err.message || `HTTP ${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}
