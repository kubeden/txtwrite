import { createClient } from "@neondatabase/neon-js";
import { BetterAuthReactAdapter } from "@neondatabase/neon-js/auth/react/adapters";
import type { Database } from "../types/database";

export const neonAuthUrl = import.meta.env.VITE_NEON_AUTH_URL ?? "";
export const neonDataApiUrl = import.meta.env.VITE_NEON_DATA_API_URL ?? "";

export const isNeonConfigured = Boolean(neonAuthUrl && neonDataApiUrl);

export const client = createClient<Database>({
  auth: {
    adapter: BetterAuthReactAdapter(),
    url: neonAuthUrl,
  },
  dataApi: {
    url: neonDataApiUrl,
  },
});
