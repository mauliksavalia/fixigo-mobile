import { env } from "../../config/env";
import { PaymentResult, PaymentSheetSession, PaymentSheetSessionRequest } from "./types";

const isStripeConfigured = Boolean(env.stripePublishableKey && !env.stripePublishableKey.includes("replace_me"));

export function getPaymentSetupStatus() {
  return {
    isStripeConfigured,
    publishableKeyPreview: isStripeConfigured
      ? `${env.stripePublishableKey.slice(0, 12)}...`
      : "Not configured",
    apiBaseUrl: env.apiBaseUrl,
  };
}

export async function createPaymentSheetSession(
  request: PaymentSheetSessionRequest,
): Promise<PaymentSheetSession> {
  const response = await fetch(`${env.apiBaseUrl}/payments/payment-sheet`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error("Could not start payment. Please try again.");
  }

  return response.json();
}

export async function runMockPaymentCheck(): Promise<PaymentResult> {
  if (!isStripeConfigured) {
    return {
      status: "mock",
      message: "Stripe publishable key is not added yet. Mock payments are active.",
    };
  }

  try {
    const response = await fetch(`${env.apiBaseUrl}/payments/status`);

    if (!response.ok) {
      throw new Error("Payment backend is not reachable.");
    }

    const body = (await response.json()) as { configured?: boolean; mode?: "test" | "live" };

    return {
      status: body.configured ? "ready" : "mock",
      message: body.configured
        ? `Stripe is connected in ${body.mode || "test"} mode.`
        : "Backend is running, but Stripe secret/publishable keys are not configured.",
    };
  } catch {
    return {
      status: "failed",
      message: "Stripe publishable key is present, but the backend payment status endpoint is not reachable.",
    };
  }
}
