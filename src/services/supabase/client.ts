import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, Platform } from "react-native";
import { createClient, processLock } from "@supabase/supabase-js";

import { env } from "../../config/env";

export const isSupabaseConfigured = Boolean(
  env.supabaseUrl &&
    env.supabasePublishableKey &&
    !env.supabaseUrl.includes("your-project-ref") &&
    !env.supabasePublishableKey.includes("replace_me"),
);

export const supabase = createClient(
  env.supabaseUrl || "https://placeholder.supabase.co",
  env.supabasePublishableKey || "placeholder",
  {
    auth: {
      ...(Platform.OS !== "web" ? { storage: AsyncStorage } : {}),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      lock: processLock,
    },
  },
);

if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
