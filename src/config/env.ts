declare const process: {
  env?: Record<string, string | undefined>;
};

function readPublicEnv(key: string, fallback = "") {
  return process.env?.[key] || fallback;
}

export const env = {
  apiBaseUrl: readPublicEnv("EXPO_PUBLIC_API_BASE_URL", "http://localhost:4242"),
  stripePublishableKey: readPublicEnv("EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY"),
  stripeMerchantName: readPublicEnv("EXPO_PUBLIC_STRIPE_MERCHANT_NAME", "Fixee Go"),
  stripeReturnUrl: readPublicEnv("EXPO_PUBLIC_STRIPE_RETURN_URL", "fixigo://stripe-redirect"),
  supabaseUrl: readPublicEnv("EXPO_PUBLIC_SUPABASE_URL"),
  supabasePublishableKey: readPublicEnv("EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
  authRedirectUrl: readPublicEnv("EXPO_PUBLIC_AUTH_REDIRECT_URL", "fixigo://auth/callback"),
};
