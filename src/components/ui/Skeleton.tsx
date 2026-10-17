import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/** Placeholder shape while data loads. Put aria-busy="true" on the container that is loading. */
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-border motion-reduce:animate-none", className)}
      {...props}
    />
  );
}
