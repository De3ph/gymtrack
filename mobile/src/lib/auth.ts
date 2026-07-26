import { Platform } from "react-native";

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

// expo-secure-store has no web implementation (ExpoSecureStore.web.js exports {}),
// so we fall back to localStorage when running on web.
function isNative(): boolean {
  return Platform.OS === "ios" || Platform.OS === "android";
}

let SecureStore: typeof import("expo-secure-store") | null = null;

async function getSecureStore() {
  if (!SecureStore && isNative()) {
    SecureStore = await import("expo-secure-store");
  }
  return SecureStore;
}

export async function getAccessToken(): Promise<string | null> {
  const store = await getSecureStore();
  if (store) {
    return store.getItemAsync(ACCESS_TOKEN_KEY);
  }
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  const store = await getSecureStore();
  if (store) {
    return store.getItemAsync(REFRESH_TOKEN_KEY);
  }
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export async function setTokens(
  accessToken: string,
  refreshToken: string
): Promise<void> {
  const store = await getSecureStore();
  if (store) {
    await store.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    await store.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    return;
  }
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export async function setAccessToken(token: string): Promise<void> {
  const store = await getSecureStore();
  if (store) {
    await store.setItemAsync(ACCESS_TOKEN_KEY, token);
    return;
  }
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export async function clearTokens(): Promise<void> {
  const store = await getSecureStore();
  if (store) {
    await store.deleteItemAsync(ACCESS_TOKEN_KEY);
    await store.deleteItemAsync(REFRESH_TOKEN_KEY);
    return;
  }
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}
