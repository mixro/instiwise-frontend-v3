import type { ComponentProps } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/cn";

/** An in-text router link: brand colour, underlined, comfortable to tap. */
export function TextLink({ className, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn(
        "inline-flex min-h-11 items-center rounded-md font-medium text-brand-text underline underline-offset-4 hover:no-underline sm:min-h-0",
        className,
      )}
      {...props}
    />
  );
}
