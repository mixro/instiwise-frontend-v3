import { Suspense } from "react";
import { useRoutes } from "react-router-dom";
import { routes } from "./routes";

/** Rendered inside a router: BrowserRouter in the app, MemoryRouter in tests. */
export function AppRoutes() {
  const element = useRoutes(routes);
  // Only the lazily loaded dev page ever suspends.
  return <Suspense fallback={null}>{element}</Suspense>;
}
