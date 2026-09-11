import { env } from "../config/env";

export type PlatformStatus = {
  database: "online" | "offline";
  payments: "configured" | "not_configured" | "offline";
  paymentMode: "test" | "live" | "unknown";
};

export async function fetchPlatformStatus(): Promise<PlatformStatus> {
  const [health, payments] = await Promise.allSettled([
    fetch(`${env.apiBaseUrl}/health`),
    fetch(`${env.apiBaseUrl}/payments/status`),
  ]);

  const database = health.status === "fulfilled" && health.value.ok ? "online" : "offline";

  if (payments.status !== "fulfilled" || !payments.value.ok) {
    return {
      database,
      payments: "offline",
      paymentMode: "unknown",
    };
  }

  const paymentBody = (await payments.value.json()) as { configured?: boolean; mode?: "test" | "live" };

  return {
    database,
    payments: paymentBody.configured ? "configured" : "not_configured",
    paymentMode: paymentBody.mode || "unknown",
  };
}
