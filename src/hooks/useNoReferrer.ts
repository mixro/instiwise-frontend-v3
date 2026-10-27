import { useEffect } from "react";

/**
 * Pages with a secret in their path (/verify-email/<token>, /reset-password/<token>,
 * /reset/<code>) never pass it on as a Referer. The server sends the same header
 * when the page is loaded (netlify.toml, nginx.conf); this covers reaching the
 * page inside the app, where no new page is loaded.
 */
export function useNoReferrer(): void {
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "referrer";
    meta.content = "no-referrer";
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);
}
