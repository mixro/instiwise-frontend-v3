import type { ReactNode } from "react";
import { StandalonePage } from "@/features/shell/StandalonePage";

interface AuthCardProps {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  /** Links under the card ("Already have an account? Sign in"). */
  footer?: ReactNode;
  /** Below everything, e.g. the development demo hints. */
  after?: ReactNode;
}

/** Sign-in and registration frame: full width on phones, a bordered card from sm. */
export function AuthCard({ title, description, children, footer, after }: AuthCardProps) {
  return (
    <StandalonePage>
      <div className="space-y-6 sm:rounded-xl sm:border sm:border-border sm:bg-surface sm:p-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && <div className="text-sm text-muted">{description}</div>}
        </div>
        {children}
      </div>
      {footer && <div className="mt-6 text-center text-sm text-muted">{footer}</div>}
      {after}
    </StandalonePage>
  );
}
