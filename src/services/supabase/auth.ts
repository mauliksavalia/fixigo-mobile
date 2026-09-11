import * as WebBrowser from "expo-web-browser";

import { env } from "../../config/env";
import { StoredUser } from "../../storage/authStorage";
import { isSupabaseConfigured, supabase } from "./client";

WebBrowser.maybeCompleteAuthSession();

export type SupabaseGoogleResult = {
  token: string;
  user: StoredUser;
};

export async function signInWithGoogleSupabase(): Promise<SupabaseGoogleResult> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured yet.");
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: env.authRedirectUrl,
      skipBrowserRedirect: true,
      scopes: "openid email profile",
    },
  });

  if (error || !data.url) {
    throw new Error(error?.message || "Could not start Google login.");
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, env.authRedirectUrl);

  if (result.type !== "success") {
    throw new Error("Google login was cancelled.");
  }

  const url = new URL(result.url);
  const code = url.searchParams.get("code");

  if (!code) {
    throw new Error("Google login did not return an auth code.");
  }

  const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError || !sessionData.session || !sessionData.user) {
    throw new Error(exchangeError?.message || "Could not finish Google login.");
  }

  const metadata = sessionData.user.user_metadata || {};
  const email = sessionData.user.email || "";
  const fullName = String(metadata.full_name || metadata.name || email.split("@")[0] || "FixiGo Customer");
  const firstName = String(metadata.given_name || fullName.split(" ")[0] || "Customer");
  const lastName = String(metadata.family_name || fullName.split(" ").slice(1).join(" ") || "");

  return {
    token: sessionData.session.access_token,
    user: {
      id: sessionData.user.id,
      email,
      firstName,
      lastName,
      name: `${firstName} ${lastName}`.trim(),
      authProvider: "google",
    },
  };
}
