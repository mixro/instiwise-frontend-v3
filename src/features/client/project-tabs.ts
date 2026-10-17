import { useParams } from "react-router-dom";

/** Project detail sections, in order. Each one is its own URL: /client/projects/:id/<tab>. */
export const PROJECT_TABS = [
  "overview",
  "agreement",
  "changes",
  "progress",
  "messages",
  "payments",
  "documents",
] as const;

export type ProjectTab = (typeof PROJECT_TABS)[number];

/** The project id from the URL; only used under /client/projects/:projectId. */
export function useProjectId(): string {
  return useParams().projectId ?? "";
}
