import { clearAuth, getToken, getUser, saveAuth, StoredUser } from "../storage/authStorage";
import { signInWithGoogleSupabase } from "./supabase/auth";
import { isSupabaseConfigured } from "./supabase/client";

export type AuthProvider = "google" | "email";

export type PendingIdentity = {
  email: string;
  provider: AuthProvider;
};

export type AccountProfileInput = {
  email: string;
  provider: AuthProvider;
  firstName: string;
  lastName: string;
  phone: string;
  code: string;
};

function fakeDelay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const MOCK_OTP_CODE = "123456";

export async function bootstrapAuth() {
  const token = await getToken();
  const user = await getUser();
  return { token, user };
}

export function normalizePhoneNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  return phone.trim();
}

export function formatPhoneForDisplay(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const localDigits = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;

  if (localDigits.length !== 10) {
    return phone;
  }

  return `(${localDigits.slice(0, 3)}) ${localDigits.slice(3, 6)}-${localDigits.slice(6)}`;
}

function assertEmail(email: string) {
  const trimmed = email.trim().toLowerCase();

  if (!/^\S+@\S+\.\S+$/.test(trimmed)) {
    throw new Error("Please enter a valid email address.");
  }

  return trimmed;
}

function assertName(value: string, label: string) {
  const trimmed = value.trim();

  if (trimmed.length < 2) {
    throw new Error(`${label} must be at least 2 characters.`);
  }

  return trimmed;
}

function assertPhone(phone: string) {
  const normalized = normalizePhoneNumber(phone);

  if (!/^\+1\d{10}$/.test(normalized)) {
    throw new Error("Please enter a valid U.S. mobile number.");
  }

  return normalized;
}

export async function startEmailIdentityMock(email: string, provider: AuthProvider) {
  await fakeDelay(450);

  return {
    email: assertEmail(email),
    provider,
  };
}

export function canUseRealGoogleLogin() {
  return isSupabaseConfigured;
}

export async function loginWithGoogle() {
  const { token, user } = await signInWithGoogleSupabase();
  await saveAuth(token, user);
  return { token, user };
}

export async function requestPhoneOtpMock(phone: string) {
  await fakeDelay(550);
  const normalizedPhone = assertPhone(phone);

  return {
    phone: normalizedPhone,
    code: MOCK_OTP_CODE,
    expiresAt: Date.now() + 5 * 60 * 1000,
  };
}

export async function verifyProfileOtpAndLogin(input: AccountProfileInput) {
  await fakeDelay(650);

  if (input.code.trim() !== MOCK_OTP_CODE) {
    throw new Error("That verification code is not correct. Use 123456 for this demo.");
  }

  const firstName = assertName(input.firstName, "First name");
  const lastName = assertName(input.lastName, "Last name");
  const email = assertEmail(input.email);
  const phone = assertPhone(input.phone);
  const token = `mock_customer_token_${Date.now()}`;
  const user: StoredUser = {
    id: `customer_${Date.now()}`,
    email,
    firstName,
    lastName,
    name: `${firstName} ${lastName}`,
    phone,
    authProvider: input.provider,
  };

  await saveAuth(token, user);
  return { token, user };
}

export async function logout() {
  await clearAuth();
}
