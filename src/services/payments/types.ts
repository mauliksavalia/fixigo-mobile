export type PaymentSheetSessionRequest = {
  jobId: string;
  customerId: string;
  customerEmail?: string;
  customerName?: string;
  amountCents: number;
  currency: "usd";
};

export type PaymentSheetSession = {
  paymentIntent: string;
  ephemeralKey?: string;
  customer?: string;
  publishableKey: string;
};

export type PaymentResult = {
  status: "ready" | "paid" | "failed" | "mock";
  message: string;
};
