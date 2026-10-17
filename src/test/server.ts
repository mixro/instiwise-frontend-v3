import { setupServer } from "msw/node";
import { handlers } from "@/mocks/handlers";

/** The mock backend for unit tests. Override a route with server.use(...) inside a test. */
export const server = setupServer(...handlers);
