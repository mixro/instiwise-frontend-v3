import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { StarterPage } from "@/features/starter/StarterPage";

// Phase 1 replaces this with the role layouts (client, operator, admin) and route guards.
export const routes = [{ path: "*", element: <StarterPage /> }];

const router = createBrowserRouter(routes);

export function App() {
  return <RouterProvider router={router} />;
}
