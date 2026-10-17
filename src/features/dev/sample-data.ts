// Demo data for /dev/components only. Amounts are whole TZS, as the API returns them.
import type { PaymentStatus } from "@/lib/status";

export const SAMPLE_CLIENT = "Neema Mwakyusa";
export const SAMPLE_OPERATOR = "Baraka Mushi";
export const SAMPLE_PHONE = "+255 754 321 987";
export const SAMPLE_AMOUNT = 450_000;
export const SAMPLE_RECEIPT = "RC-2026-0014";

/** Pretend network time, long enough to see loading states. */
export const DEMO_DELAY_MS = 800;

export const PAYMENT_METHODS = ["cash", "bank", "mobile", "other"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface SamplePayment {
  receipt: string;
  date: string;
  client: string;
  method: PaymentMethod;
  amount: number;
  status: PaymentStatus;
}

export const SAMPLE_PAYMENTS: SamplePayment[] = [
  {
    receipt: "RC-2026-0011",
    date: "2026-09-02",
    client: "Neema Mwakyusa",
    method: "mobile",
    amount: 300_000,
    status: "RECORDED",
  },
  {
    receipt: "RC-2026-0012",
    date: "2026-09-19",
    client: "Baraka Mushi",
    method: "bank",
    amount: 1_250_000,
    status: "RECORDED",
  },
  {
    receipt: "RC-2026-0013",
    date: "2026-10-03",
    client: "Rehema Said",
    method: "cash",
    amount: 85_000,
    status: "REVERSED",
  },
  {
    receipt: "RC-2026-0014",
    date: "2026-10-15",
    client: "Juma Kassim",
    method: "mobile",
    amount: 450_000,
    status: "RECORDED",
  },
];
