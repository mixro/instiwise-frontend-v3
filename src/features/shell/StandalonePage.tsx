import type { ReactNode } from "react";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Logo } from "@/components/brand/Logo";
import { DemoBanner } from "./DemoBanner";
import { DevToolbar } from "./DevToolbar";
import { MAIN_CONTENT_ID, SkipLink } from "./SkipLink";

/** Frame for pages outside the role layouts (sign-in, invitations, 404, no access). */
export function StandalonePage({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <SkipLink />
      <DemoBanner />
      <DevToolbar />
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <Logo height={32} />
          <div className="ml-auto flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main id={MAIN_CONTENT_ID} className="mx-auto max-w-lg px-4 py-8 sm:py-16">
        {children}
      </main>
    </div>
  );
}
