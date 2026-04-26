// Demo mode configuration. Lets you bypass Firebase Auth in dev / preview environments
// without leaking the bypass into production.
//
// Demo mode is ONLY enabled when:
//   1. NEXT_PUBLIC_DEMO_MODE === "true"  AND
//   2. NODE_ENV !== "production"
//
// Even if the env var is set in a production build, this guard refuses to enable it.

const isProduction = process.env.NODE_ENV === "production";
const isDemoModeRequested = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export const DEMO_CONFIG = {
  enabled: isDemoModeRequested && !isProduction,
  userId: "demo-user-123",
  token: "demo-token",
  email: "demo@example.com",
  displayName: "Demo User",
} as const;

export function isDemoUser(userId: string): boolean {
  return DEMO_CONFIG.enabled && userId === DEMO_CONFIG.userId;
}

export function isDemoToken(token: string): boolean {
  return DEMO_CONFIG.enabled && token === DEMO_CONFIG.token;
}

if (DEMO_CONFIG.enabled) {
  console.warn(
    "[Demo Mode] Enabled — auth bypassed for demo token. Never deploy to production.",
  );
}
if (isDemoModeRequested && isProduction) {
  console.warn("[Demo Mode] Requested but disabled (production environment).");
}
