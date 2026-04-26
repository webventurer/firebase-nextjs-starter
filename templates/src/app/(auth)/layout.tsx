"use client";

import type { ReactNode } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";

// Layout for authenticated routes. AuthGuard redirects to /login if no user.
// Add your dashboard chrome (sidebar, top nav, email verification banner) here.
// Note: marking this layout "use client" makes the entire (auth) subtree a client
// boundary — fine for a SaaS dashboard where every page reads useAuth() anyway,
// but if a nested route needs server components, gate it with a server-side
// session check instead of nesting under this layout.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
