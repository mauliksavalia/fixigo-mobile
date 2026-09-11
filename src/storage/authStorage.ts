import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const TOKEN_KEY = "fixigo_auth_token";
const USER_KEY = "fixigo_user_json";

export type StoredUser = {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  phone?: string;
  authProvider?: "google" | "email";
};

async function setStoredItem(key: string, value: string) {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.localStorage.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

async function getStoredItem(key: string): Promise<string | null> {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return window.localStorage.getItem(key);
  }

  return SecureStore.getItemAsync(key);
}

async function deleteStoredItem(key: string) {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.localStorage.removeItem(key);
    return;
  }

  await SecureStore.deleteItemAsync(key);
}

export async function saveAuth(token: string, user: StoredUser) {
  await setStoredItem(TOKEN_KEY, token);
  await setStoredItem(USER_KEY, JSON.stringify(user));
}

export async function getToken(): Promise<string | null> {
  return getStoredItem(TOKEN_KEY);
}

export async function getUser(): Promise<StoredUser | null> {
  const raw = await getStoredItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

export async function clearAuth() {
  await deleteStoredItem(TOKEN_KEY);
  await deleteStoredItem(USER_KEY);
}
