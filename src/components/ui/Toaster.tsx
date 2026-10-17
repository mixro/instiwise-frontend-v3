import { CircleAlert, CircleCheck, Info, type LucideIcon } from "lucide-react";
import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";
import { ToastContext, type ToastOptions, type ToastVariant } from "@/lib/toast-context";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "./Toast";

const ICONS: Record<ToastVariant, LucideIcon> = {
  info: Info,
  success: CircleCheck,
  error: CircleAlert,
};

type QueuedToast = ToastOptions & { id: number };

/** Provides useToast() to everything inside it and renders the toasts. Mounted once in AppProviders. */
export function Toaster({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [toasts, setToasts] = useState<QueuedToast[]>([]);
  const nextId = useRef(0);

  const toast = useCallback((options: ToastOptions) => {
    nextId.current += 1;
    const id = nextId.current;
    setToasts((current) => [...current, { ...options, id }]);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  function dismiss(id: number) {
    setToasts((current) => current.filter((item) => item.id !== id));
  }

  return (
    <ToastContext.Provider value={value}>
      <ToastProvider label={t("ui.notifications")} duration={5000}>
        {children}
        {toasts.map(({ id, title, description, variant = "info" }) => {
          const Icon = ICONS[variant];
          const isError = variant === "error";
          return (
            <Toast
              key={id}
              variant={variant}
              // Errors are announced immediately and stay longer.
              type={isError ? "foreground" : "background"}
              duration={isError ? 8000 : undefined}
              onOpenChange={(open) => {
                if (!open) dismiss(id);
              }}
            >
              <Icon
                className={cn("mt-0.5 size-4 shrink-0", variant === "success" && "text-brand-text")}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <ToastTitle>{title}</ToastTitle>
                {description && <ToastDescription>{description}</ToastDescription>}
              </div>
              <ToastClose />
            </Toast>
          );
        })}
        <ToastViewport />
      </ToastProvider>
    </ToastContext.Provider>
  );
}
