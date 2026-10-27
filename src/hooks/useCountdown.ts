import { useCallback, useEffect, useState } from "react";

/**
 * Whole seconds left until `until` (a time in ms), counting down once a second;
 * 0 when there is nothing to wait for. `start` sets a new end.
 */
export function useCountdown(): [seconds: number, start: (seconds: number) => void] {
  const [until, setUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (until <= now) return;
    const timer = window.setTimeout(() => setNow(Date.now()), 1000);
    return () => window.clearTimeout(timer);
  }, [until, now]);

  const start = useCallback((seconds: number) => {
    const at = Date.now();
    setNow(at);
    setUntil(at + Math.max(0, seconds) * 1000);
  }, []);

  return [Math.max(0, Math.ceil((until - now) / 1000)), start];
}
