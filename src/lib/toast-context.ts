import { createContext } from "react";

export type ToastVariant = "info" | "success" | "error";

export interface ToastOptions {
  /** Already translated, e.g. t("payments.recorded"). */
  title: string;
  description?: string;
  variant?: ToastVariant;
}

export interface ToastContextValue {
  toast: (options: ToastOptions) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);
