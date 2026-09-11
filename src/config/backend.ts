export const backendConfig = {
  environment: "development",
  authProvider: "mock",
  databaseProvider: "mock",
  storageProvider: "mock",
  paymentsProvider: "mock",
  smsProvider: "mock",
  paymentEndpoint: "/payments/payment-sheet",
  recommendedProductionStack: {
    auth: "Firebase Auth or Supabase Auth",
    database: "Firestore or Supabase Postgres",
    storage: "Firebase Storage or Supabase Storage",
    payments: "Stripe",
    sms: "Twilio Verify",
    maps: "Google Maps Platform",
  },
};
