import { render } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { AppRoutes } from "@/app/AppRoutes";
import { AppProviders } from "@/app/providers";
import type { Role } from "@/lib/roles";
import { MOCK_ROLE_STORAGE_KEY, MOCK_SIGNED_OUT } from "@/lib/session-context";

function LocationProbe() {
  const { pathname } = useLocation();
  return <output data-testid="location">{pathname}</output>;
}

/**
 * The whole app at `path`, signed in with the mock `role` (null: signed out).
 * API calls are answered by the MSW handlers (src/test/server.ts).
 */
export function renderApp(path: string, role: Role | null = "CLIENT") {
  localStorage.setItem(MOCK_ROLE_STORAGE_KEY, role ?? MOCK_SIGNED_OUT);
  return render(
    <AppProviders>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
        <LocationProbe />
      </MemoryRouter>
    </AppProviders>,
  );
}
