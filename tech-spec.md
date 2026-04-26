# Tech spec

Drop this into a new repo's `CLAUDE.md` or `docs/` to tell an AI or developer exactly how to set up the project. This is the actionable version of [stack.md](stack.md) — that doc explains *why*, this one explains *how*.

## Scaffold

```bash
pnpm create next-app@latest my-app --typescript --tailwind --no-eslint --app --src-dir --import-alias "@/*" --use-pnpm --no-turbopack --yes
cd my-app
```

If you ran `scripts/create.sh`, this is already done.

## Install: frontend

```bash
# Core (Next ships with React already)
pnpm add next-themes sonner framer-motion

# Styling
pnpm add -D tailwindcss @tailwindcss/postcss tw-animate-css
pnpx shadcn@latest init -d -y       # new-york style, neutral base, lucide icons
pnpx shadcn@latest add button card table badge tabs separator skeleton dialog drawer input label -y

# Forms + validation
pnpm add react-hook-form zod @hookform/resolvers

# Icons + UI primitives
pnpm add lucide-react radix-ui

# Utilities
pnpm add clsx tailwind-merge class-variance-authority date-fns
```

## Install: backend & services

```bash
# Firebase
pnpm add firebase firebase-admin

# Stripe
pnpm add stripe @stripe/stripe-js

# Cloudflare R2 (S3-compatible)
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

## Install: linting + formatting

```bash
pnpm add -D @biomejs/biome
pnpx @biomejs/biome init
```

## Install: testing

```bash
pnpm add -D vitest @testing-library/react @testing-library/jest-dom jsdom @vitejs/plugin-react
```

## Project structure

```
my-app/
├── apphosting.yaml          # Firebase App Hosting config (env + secrets + runConfig)
├── firebase.json            # Wires Firestore rules + Hosting source
├── firestore.rules          # Owner-only rules (extend as you add collections)
├── firestore.indexes.json   # Composite indexes
├── .firebaserc              # Project ID (rename .firebaserc.template)
├── biome.json               # Lint + format config
├── components.json          # shadcn/ui config
├── next.config.ts
├── postcss.config.mjs
├── vitest.config.ts
├── tsconfig.json
└── src/
    ├── app/                          # Next.js App Router
    │   ├── layout.tsx                # Wraps app in <Providers>; SEO metadata
    │   ├── page.tsx                  # Marketing home (public)
    │   ├── error.tsx                 # Global error boundary
    │   ├── not-found.tsx             # Custom 404
    │   ├── globals.css
    │   ├── (public)/                 # Route group — unauthenticated chrome
    │   │   ├── layout.tsx            # Centered card layout
    │   │   ├── login/page.tsx
    │   │   └── signup/page.tsx
    │   ├── (auth)/                   # Route group — wrapped in <AuthGuard>
    │   │   ├── layout.tsx            # Redirects to /login if no user
    │   │   └── dashboard/page.tsx
    │   └── api/
    │       └── stripe/
    │           ├── webhook/route.ts  # Verifies signature; idempotent
    │           ├── checkout/route.ts # Creates Stripe Checkout session
    │           └── portal/route.ts   # Creates Billing Portal session
    ├── components/
    │   ├── ui/                       # shadcn/ui generated components
    │   ├── auth/AuthGuard.tsx        # Client-side route protection
    │   └── providers/Providers.tsx   # Auth + Theme + Toaster
    ├── hooks/
    │   └── useAuth.tsx               # AuthProvider + useAuth() hook
    ├── lib/
    │   ├── firebase.ts               # Client SDK (Auth + Firestore + emulator)
    │   ├── firebase-admin.ts         # Admin SDK (server-side, ADC fallback)
    │   ├── firebase-storage.ts       # Browser-side upload helper
    │   ├── r2.ts                     # Server-side R2 (S3-compatible) client
    │   ├── stripe.ts                 # Stripe server client
    │   ├── demo-config.ts            # Demo mode flag (production-safe)
    │   ├── admin.ts                  # isAdminEmail() — ADMIN_EMAILS whitelist
    │   ├── utils.ts                  # cn() helper
    │   └── api/
    │       ├── auth.ts               # verifyAuth() + verifyOwnership()
    │       ├── admin-auth.ts         # verifyAdminAuth() — admin-only routes
    │       └── responses.ts          # Standard response helpers
    └── __tests__/
        ├── setup.ts
        └── smoke.test.ts             # Replace with your real tests
```

## Firebase project setup

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Authentication** — turn on the providers you need (Email/Password, Google, etc.)
3. Enable **Firestore** — start in production mode; the included rules deny everything except owner-keyed access
4. Enable **App Hosting** in the console (it provisions a Cloud Run backend)
5. Connect your GitHub repo so pushes to `main` auto-deploy

```bash
# Update your project ID
mv .firebaserc.template .firebaserc
# Edit .firebaserc and replace YOUR_PROJECT_ID
```

## Configuration

### Next.js (`next.config.ts`)

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;
```

### Tailwind (PostCSS — `postcss.config.mjs`)

Tailwind v4 uses a PostCSS plugin — no `tailwind.config.ts` file required. Configure via CSS:

```css
/* src/app/globals.css */
@import "tailwindcss";
@import "tw-animate-css";
```

### Firebase client (`src/lib/firebase.ts`)

Reads `NEXT_PUBLIC_FIREBASE_*` env vars and initialises `auth` + `db`. Optionally connects to the local emulator suite when `NEXT_PUBLIC_USE_EMULATOR=true`.

### Firebase Admin (`src/lib/firebase-admin.ts`)

Two paths:
- **Local development:** reads `FB_SERVICE_ACCOUNT_KEY` (a JSON string in `.env.local`)
- **Production (App Hosting / Cloud Functions / Cloud Run):** uses Application Default Credentials — no key needed

<mark>The env var is `FB_SERVICE_ACCOUNT_KEY`, not `FIREBASE_SERVICE_ACCOUNT_KEY`.</mark> The `FIREBASE_` prefix is reserved by Firebase tooling — using it for your own variables can cause silent conflicts (App Hosting may reject it, and the Admin SDK auto-reads some `FIREBASE_*` names itself) that are painful to debug.

### Vitest (`vitest.config.ts`)

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/__tests__/setup.ts"],
    include: ["src/**/*.{test,spec}.{js,ts,jsx,tsx}"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

## Environment variables

```bash
# .env.local (never commit this file)

# firebase (public)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# firebase admin (local dev only — production uses ADC)
FB_SERVICE_ACCOUNT_KEY=        # JSON string of the service account key

# stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# cloudflare r2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=

# admin (comma-separated emails — these users get access to /admin routes)
ADMIN_EMAILS=

# misc
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_USE_EMULATOR=false
```

Add `.env.local` to `.gitignore`.

## Scripts (`package.json`)

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "biome check .",
    "format": "biome check --write .",
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

## Deployment via Firebase App Hosting

1. Connect your GitHub repo in Firebase Console → **App Hosting** → **Create backend**
2. Set the Region (e.g. `us-east4`) and root directory (usually `.` or `web` depending on your monorepo layout)
3. Edit `apphosting.yaml` to declare public env vars and reference secrets from Secret Manager
4. Set secrets:
   ```bash
   firebase apphosting:secrets:set STRIPE_SECRET_KEY
   firebase apphosting:secrets:set STRIPE_WEBHOOK_SECRET
   firebase apphosting:secrets:set R2_ACCOUNT_ID
   firebase apphosting:secrets:set R2_ACCESS_KEY_ID
   firebase apphosting:secrets:set R2_SECRET_ACCESS_KEY
   firebase apphosting:secrets:set R2_BUCKET
   firebase apphosting:secrets:set ADMIN_EMAILS
   firebase apphosting:secrets:grantaccess STRIPE_SECRET_KEY,STRIPE_WEBHOOK_SECRET,R2_ACCOUNT_ID,R2_ACCESS_KEY_ID,R2_SECRET_ACCESS_KEY,R2_BUCKET,ADMIN_EMAILS --backend YOUR_BACKEND_NAME
   ```
5. Push to `main` — App Hosting builds and rolls out automatically
6. Or trigger manually:
   ```bash
   firebase apphosting:rollouts:create YOUR_BACKEND_NAME --git-branch main
   ```

### IAM roles for the deploy + runtime service accounts

Two service accounts are involved. App Hosting creates them automatically, but if you ever script deploys from CI, or hit a permission error on first push, knowing which is which helps.

| Account | Purpose | Required roles |
|:--------|:--------|:---------------|
| **Deployer** (your `firebase login` user, or a CI service account) | Calls `firebase apphosting:*` commands | `roles/firebaseapphosting.admin`, `roles/iam.serviceAccountUser`, `roles/secretmanager.admin` |
| **Runtime backend SA** (auto-created, `firebase-app-hosting-compute@<project>.iam.gserviceaccount.com`) | Runs your Next.js app on Cloud Run, reads secrets, calls Firestore | `roles/secretmanager.secretAccessor` (per secret, granted by `apphosting:secrets:grantaccess`), Firebase Admin permissions inherited from project membership |

If a deploy fails with "permission denied accessing secret", it's almost always missing `secretAccessor` on the runtime SA — re-run `firebase apphosting:secrets:grantaccess SECRET_NAME --backend YOUR_BACKEND_NAME`.

### Secret rotation

When a secret leaks (key in a screenshot, ex-employee with the old value, etc.):

```bash
# 1. Create a new version in Secret Manager — becomes the active version automatically
firebase apphosting:secrets:set STRIPE_SECRET_KEY

# 2. Force a fresh rollout so the new value loads into Cloud Run instances
firebase apphosting:rollouts:create YOUR_BACKEND_NAME --git-branch main

# 3. Once the rollout is healthy, disable the old version (keeps the audit trail; doesn't delete)
gcloud secrets versions list STRIPE_SECRET_KEY --project=YOUR_PROJECT_ID
gcloud secrets versions disable OLD_VERSION_NUMBER --secret=STRIPE_SECRET_KEY --project=YOUR_PROJECT_ID
```

<mark>Disable, don't destroy.</mark> A disabled version can be re-enabled if a deploy regression makes you need to roll back; a destroyed version is gone forever. After 30 days of confidence in the new value, destroy the old version with `gcloud secrets versions destroy`.

### Custom domain

Connect your domain in Firebase Console → **App Hosting** → **Settings** → **Domains**. App Hosting handles SSL. Update `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` in `apphosting.yaml` once the domain is live.

Setting `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` to your custom domain (instead of the default `<project-id>.firebaseapp.com`) makes Firebase Auth emails, password-reset links, and OAuth redirects all use your branded domain. Configure auth email templates in Firebase Console → **Authentication** → **Templates**.

## Local development with Firebase emulators

The starter ships with the emulator suite wired up. To use it:

```bash
# Install Firebase CLI globally if you haven't already
npm install -g firebase-tools
firebase login

# Start the emulator suite (Auth :9099, Firestore :8080, Storage :9199, UI :4000)
pnpm emulators

# In another terminal, run the app pointing at emulators
NEXT_PUBLIC_USE_EMULATOR=true pnpm dev
```

Persisting emulator state between runs:

```bash
pnpm emulators:export   # save current state to ./emulator-data
pnpm emulators:import   # start emulators with that data, save changes on exit
```

The `firebase.ts` client wires up Auth + Firestore emulators when `NEXT_PUBLIC_USE_EMULATOR === "true"`. Add Storage if you start using it.

## Authentication architecture

The starter ships a complete client+server auth setup:

- **Client side** — `src/hooks/useAuth.tsx` exposes an `AuthProvider` (mounted from `src/components/providers/Providers.tsx` at the root layout) and a `useAuth()` hook returning `{ user, userProfile, loading, signUp, signIn, signOut, ... }`. The provider listens to `onAuthStateChanged` and syncs a Firestore `users/{uid}` profile doc.
- **Route protection** — `src/components/auth/AuthGuard.tsx` is a client component that redirects to `/login` if there is no user. The `(auth)/` route group's `layout.tsx` wraps every authenticated page in `<AuthGuard>`.
- **Server side (API routes)** — `src/lib/api/auth.ts` exposes `verifyAuth(request)` which decodes the `Authorization: Bearer <id-token>` header against Firebase Admin and returns `{ userId, email }` or an `AuthError` whose `error` field is a ready-to-return `NextResponse`. Use `verifyOwnership(authUserId, resourceUserId)` to gate access to user-owned documents.

```typescript
// Example: a protected API route
import { isAuthError, verifyAuth } from "@/lib/api/auth";
import { successResponse } from "@/lib/api/responses";

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (isAuthError(auth)) return auth.error;
  return successResponse({ userId: auth.userId });
}
```

```typescript
// Client side: send the Firebase ID token with every request
const token = await user.getIdToken();
const response = await fetch("/api/protected", {
  headers: { Authorization: `Bearer ${token}` },
});
```

## Admin access

The starter ships an email-whitelist admin pattern (`src/lib/admin.ts` + `src/lib/api/admin-auth.ts`):

- `ADMIN_EMAILS` (set via Secret Manager in production) holds a comma-separated list of admin emails
- `isAdminEmail(email)` checks the whitelist (case-insensitive)
- `verifyAdminAuth(request)` wraps `verifyAuth` and additionally enforces admin status, returning **403** if the authenticated user isn't on the list

```typescript
// Example: an admin-only API route
import { isAdminAuthError, verifyAdminAuth } from "@/lib/api/admin-auth";

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (isAdminAuthError(auth)) return auth.error;
  // auth.userId and auth.email are now available
}
```

<mark>Why an env var, not a Firestore `role` field?</mark> Storing admin status in env prevents privilege escalation — nobody can promote themselves by writing to a `users/{uid}` document. The list is also immutable at runtime: changing it requires a deploy, which means admin grants leave a git/audit trail by construction.

### Audit logs

For high-stakes admin operations (plan changes, lifetime grants, refunds, deletions), write an audit record to Firestore:

```typescript
await adminDb.collection("admin_logs").doc().set({
  timestamp: FieldValue.serverTimestamp(),
  adminEmail: auth.email,
  adminUid: auth.userId,
  actionType: "plan_change",
  targetUid: targetUserId,
  previousValue: prevPlan,
  newValue: newPlan,
});
```

The shipped `firestore.rules` deny client access to `admin_logs` by omission — only the Admin SDK can read/write the collection, so the trail is tamper-resistant from the browser.

## Demo mode

`src/lib/demo-config.ts` exposes a `DEMO_CONFIG.enabled` flag controlled by `NEXT_PUBLIC_DEMO_MODE === "true"`. **Demo mode is hard-disabled in production** even if the env var is set — the guard checks `NODE_ENV` independently. When enabled, the auth provider boots with a fake user, and `verifyAuth` accepts a magic `demo-token` Bearer string. Useful for:

- Local dev without configuring a Firebase project
- Vercel preview deploys
- Demos / screenshots

Never set `NEXT_PUBLIC_DEMO_MODE=true` in `apphosting.yaml`. The starter sets it explicitly to `"false"`.

## Plan-based feature gating

A common pattern for SaaS: gate features by the user's plan. The shape that tends to work — define a `PLAN_FEATURES: Record<PlanType, Features>` map in `src/types/index.ts`, store the user's `plan` field on the Firestore user doc, and read it via a `usePlan()` hook that returns `{ plan, features, hasFeature(name) }`. The starter doesn't ship this because the plan shape is product-specific; add it once you know your tiers.

For Stripe-driven plans, the matching pattern is to store `priceId → planKey` lookups in `src/lib/stripe.ts` so the webhook can map subscription changes to plan updates.

## Email options

The starter doesn't ship an email integration — different products want different things. Options:

- **Loops.so** — built for product email (onboarding sequences, transactional, drip). Good DX, decent free tier. `pnpm add loops`.
- **Resend** — simpler transactional-only API, great for one-off sends. `pnpm add resend`.
- **AgentMail** — inbox-style; useful when you want users to email *you* (e.g. inbound contact form handling).
- **Firebase email templates** — for auth-only emails (verification, reset). Configure in console; no code needed.

Wire whichever you pick into a `src/lib/email.ts` helper and call it from API routes after Firestore writes.

## Stripe webhook patterns

Two patterns the shipped webhook relies on — both worth knowing about before you change the route.

### Idempotency via the `stripeEvents` collection

Stripe retries webhook deliveries on any 5xx response, and may also retry due to network issues, so handlers **must** be idempotent. The webhook records each processed `event.id` in a `stripeEvents/{eventId}` document and short-circuits if it sees a duplicate.

<mark>On 5xx we deliberately do *not* record the event</mark> — leaving it unrecorded so Stripe's next retry re-attempts the work. Recording before the work succeeds would mean a transient failure silently swallows the event.

### `metadata.firebaseUid` on Checkout sessions

The checkout route stamps `firebaseUid` into the Stripe Customer's metadata, the Checkout Session's metadata, and the subsequent Subscription / PaymentIntent. The webhook reads this back to find the Firestore user doc.

This matters because on the **first** purchase, the Firestore user doc has no `stripeCustomerId` yet — a `where("stripeCustomerId", "==", customerId)` query returns nothing. The `firebaseUid` metadata gives the webhook a reliable second path: look up `users/{firebaseUid}` directly and stamp the customer ID onto the doc.

## Rate limiting

The starter does **not** ship a rate limiter. In-memory rate limiting (a Map keyed by user+endpoint) breaks on Firebase App Hosting because each Cloud Run instance has its own memory — a user hitting two instances bypasses the limit. For production, use:

- **Upstash Redis** — serverless Redis, works from Cloud Run; the `@upstash/ratelimit` library is purpose-built for this
- **Firestore-backed** — store request counts in a `rateLimits/{userId}` doc with TTL; cheap but slow under heavy load
- **Cloud Armor** — for IP-level limiting at the load balancer

## API routes vs server actions

Next.js 15+ supports server actions (`"use server"` functions called directly from client components). The starter uses **API routes** because:

- Auth verification needs the full `NextRequest` (headers, raw body for Stripe webhooks)
- API routes are the natural surface for third-party integrations (webhooks, OAuth callbacks)
- Server actions are best for form submissions where the client and server are tightly coupled

Use server actions for forms; use API routes for everything else.

## Coding conventions

- TypeScript strict mode
- Feature-based directory structure (not file-type-based) once `src/` grows
- Collocate tests next to source files (`Component.tsx` + `Component.test.tsx`)
- Use server components by default; reach for `"use client"` only when needed (state, effects, browser APIs)
- Zod schemas for all API request/response validation
- Firestore: keep documents shallow, model for read patterns, use composite indexes when queries combine fields

## When to use which storage

- **Firebase Storage** — uploads triggered by an authenticated user from the browser. Storage security rules reuse `request.auth.uid`. No server-side code path needed.
- **Cloudflare R2** — server-generated artefacts (PDFs, video, exports), large public files, anything where egress cost matters. Always uploaded from API routes via the AWS SDK; downloads via presigned URLs or a public R2 URL.

## Removing features you don't need

The starter ships everything wired up. None of the optional features cross-import each other, so removing one doesn't cascade. The lib code uses lazy initialisation — leaving a feature physically present (without env vars) won't crash the app — but the unused deps still ship in your bundle, so prune what you don't use.

### Drop Stripe

1. Delete `src/app/api/stripe/` and `src/lib/stripe.ts`
2. Remove `stripe` and `@stripe/stripe-js` from `package.json`; run `pnpm install`
3. Remove `STRIPE_*` entries from `apphosting.yaml` and `.env.example`

### Drop Cloudflare R2

1. Delete `src/lib/r2.ts`
2. Remove `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` from `package.json`; run `pnpm install`
3. Remove `R2_*` entries from `apphosting.yaml` and `.env.example`

### Drop admin auth

1. Delete `src/lib/admin.ts` and `src/lib/api/admin-auth.ts`
2. Remove `ADMIN_EMAILS` from `apphosting.yaml` and `.env.example`

<mark>Always remove unused secrets from `apphosting.yaml`, not just `.env.example`.</mark> App Hosting fails the deploy if `apphosting.yaml` references a secret that doesn't exist in Secret Manager — so an unused-but-still-listed secret will block your first push to `main`.
