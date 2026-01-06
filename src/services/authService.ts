import { saveAuth, clearAuth, getUser, getToken, StoredUser } from "../storage/authStorage";

function fakeDelay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function bootstrapAuth() {
  const token = await getToken();
  const user = await getUser();
  return { token, user };
}

export async function loginWithEmail(email: string, password: string) {
  await fakeDelay(700);

  // Mock validation
  if (!email.includes("@") || password.length < 4) {
    throw new Error("Invalid email or password (mock).");
  }

  const token = `mock_token_${Date.now()}`;
  const user: StoredUser = { id: "mock-user-1", email, name: "Fixigo Customer" };

  await saveAuth(token, user);
  return { token, user };
}

export async function loginWithGoogleMock() {
  await fakeDelay(700);

  // This is mock. Later you’ll integrate real Google Auth.
  const token = `mock_google_token_${Date.now()}`;
  const user: StoredUser = { id: "mock-google-1", email: "customer@gmail.com", name: "Google Customer" };

  await saveAuth(token, user);
  return { token, user };
}

export async function logout() {
  await clearAuth();
}