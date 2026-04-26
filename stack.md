# Firebase starter stack

A starting point for building a Next.js app on the bundled Firebase platform — Auth, Firestore, App Hosting, and Storage under one roof. Stripe for payments, Cloudflare R2 for cost-efficient object storage when egress matters, shadcn/ui + Tailwind v4 for styling. <mark>Each piece is replaceable, but the gravitational pull of Firebase is real — pick this stack when you want speed-to-launch over architectural neutrality.</mark>

Scaffold with `pnpm create next-app@latest` and add pieces as needed.

## Why Next.js, not Vite

**Next.js for content + apps. Vite for pure apps.** Firebase App Hosting is built around Next.js (it deploys to Cloud Run with Next-aware caching and SSR). The App Router gives you server components, API routes, and SEO-friendly content pages in one bundle — which matters for SaaS products that have both an app surface (`/dashboard`) and a marketing surface (`/`, `/pricing`, `/blog`).

If you have **no marketing surface** and the product is purely an authenticated dashboard, see [`app-starter`](../app-starter) — Vite is faster to boot, lighter to reason about, and has no opinions about routing or data fetching.

## Why Firebase, not Neon + Clerk + Drizzle

The real trade-off is **modular vs bundled**. Firebase isn't "more advanced" than Neon + Clerk + Drizzle — it's more **bundled**. Auth, database, hosting, storage, realtime, and offline sync all live under one project. The cost is vendor lock-in: <mark>Firestore's data model doesn't translate to anything else, so leaving Firebase later means a rewrite, not a port.</mark>

| Concern | Firebase (this starter) | Neon + Clerk + Drizzle ([app-starter](../app-starter)) |
|:--------|:------------------------|:--------------------------------------------|
| **Database** | Firestore (NoSQL document store) | Postgres |
| **Auth** | Firebase Auth (built-in) | Clerk (third-party SaaS) |
| **Realtime** | Yes — Firestore listeners | No — would need a separate service |
| **Storage** | Yes — Firebase Storage | No — bring your own (S3, R2) |
| **Edge functions** | Yes — Cloud Functions | No (Hono runs anywhere though) |
| **Offline support** | Yes — Firestore offline cache | No |
| **Pricing model** | Pay per read/write/storage | Pay for compute |
| **Vendor lock-in** | **High** — proprietary APIs | Low — standard Postgres |

**Pick Firebase when:**
- You want auth + database + realtime + storage bundled, not glued together yourself
- You're shipping a mobile-first or offline-capable app
- Time-to-launch matters more than long-term portability
- You're comfortable with NoSQL data modelling

**Pick the modular route when:**
- You want standard Postgres so you can switch hosting providers later
- You want stronger type guarantees through your data layer (Drizzle)
- You expect to outgrow Firebase's pricing model on heavy reads

## Core technologies

- **Framework:** Next.js 16 (App Router) + TypeScript + React 19
- **Styling:** Tailwind v4 + shadcn/ui (new-york style, neutral base) + `tw-animate-css`
- **UI primitives:** `radix-ui` (umbrella) + `lucide-react` icons
- **Animation:** Framer Motion (declarative, React-friendly)
- **Forms:** React Hook Form + Zod validation + `@hookform/resolvers`
- **Theming:** `next-themes` (light/dark + system)
- **Toasts:** Sonner
- **Linting + formatting:** Biome (one tool, replaces ESLint + Prettier)
- **Testing:** Vitest + Testing Library + jsdom

**Backend & services:**

- **Auth:** Firebase Auth
- **Database:** Firestore (client SDK + Admin SDK)
- **Hosting:** Firebase App Hosting (managed Cloud Run under the hood)
- **Storage (browser-direct):** Firebase Storage
- **Storage (server-side, cost-efficient):** Cloudflare R2 (S3-compatible, zero egress)
- **Payments:** Stripe

## Why these choices

### Storage — both Firebase Storage and Cloudflare R2

Two storage clients ship by default because they solve different problems:

| Use case | Pick | Why |
|:---------|:-----|:----|
| Browser uploads from authenticated users | **Firebase Storage** | Storage rules reuse your Firebase Auth context — no extra auth server-side |
| Large public files (images, videos) served at scale | **Cloudflare R2** | Zero egress fees; if your bandwidth bill is the problem, R2 ends it |
| Server-generated artefacts (PDFs, exports) | **Cloudflare R2** | Server-side uploads via S3 SDK, presigned URLs for downloads |

<mark>Don't reach for R2 just because it's there — Firebase Storage is fine for typical app workloads. R2 earns its place once egress costs become a real line item.</mark>

### UI library

**shadcn/ui** — copy-paste components built on Radix primitives. You own the code, style it however you want, and the bundle only includes what you use. We initialise with the `new-york` style and `neutral` base colour, lucide icons. shadcn writes components into `src/components/ui/` — fully editable.

### Authentication

**Firebase Auth** — included with Firebase. Email/password, OAuth providers (Google, GitHub, Apple), magic links. Pairs naturally with Firestore security rules (`request.auth.uid`).

### ORM

There is no ORM. Firestore is a document store with its own query API — adding an ORM on top fights the model. Use the Firebase SDKs directly (`firebase/firestore` on the client, `firebase-admin/firestore` on the server). For complex queries, model your collections to suit your access patterns rather than reaching for joins.

### Hosting

**Firebase App Hosting** — purpose-built for Next.js. Deploys from git push, manages SSL, runs on Cloud Run with global CDN. Configuration lives in `apphosting.yaml` (build env vars, runtime secrets, `runConfig` for CPU/memory/instance limits). Secrets resolve from Google Cloud Secret Manager.

| Alternative | Why not (default) |
|:------------|:------------------|
| **Vercel** | Best Next.js DX overall, but you'd run two clouds (Vercel for app, GCP for Firebase) |
| **Cloud Run direct** | More control, but you write the Dockerfile + CI yourself |
| **Cloudflare Pages** | Limited Node runtime support; doesn't fit Next.js App Router cleanly |

### Services

- **Payments:** Stripe — industry standard, best docs, widest payment method support. Sample webhook + checkout + portal routes ship in `templates/src/app/api/stripe/`
- **Email (optional):** Loops.so — built for product email; add when needed (see `tech-spec.md` for alternatives)
- **Analytics (optional):** PostHog — open source, self-hostable, combines product analytics + session replay + feature flags

## What's wired up out of the box

Beyond the raw stack, the starter ships several **architecture patterns** so a new app boots with auth, a protected dashboard, and Stripe wiring on day one. See [`tech-spec.md`](tech-spec.md) for the full walkthrough.

| Pattern | What it gives you | Where it lives |
|:--------|:------------------|:---------------|
| Auth provider + `useAuth()` hook | Firebase Auth state + Firestore profile sync | `src/hooks/useAuth.tsx` |
| `<AuthGuard>` component | Client-side redirect to `/login` if no user | `src/components/auth/AuthGuard.tsx` |
| Route groups `(public)` / `(auth)` | Separate layouts for unauth vs authenticated chrome | `src/app/(public)`, `src/app/(auth)` |
| `verifyAuth()` API helper | Decodes Bearer ID token; returns user or NextResponse error | `src/lib/api/auth.ts` |
| `verifyAdminAuth()` + email whitelist | Admin-only routes via `ADMIN_EMAILS` env var (no Firestore role field) | `src/lib/admin.ts` + `src/lib/api/admin-auth.ts` |
| API response helpers | Standard JSON shape across all endpoints | `src/lib/api/responses.ts` |
| Demo mode | Auth bypass for dev/preview, hard-disabled in production | `src/lib/demo-config.ts` |
| Stripe checkout + portal | Subscription + one-time payments, customer portal | `src/app/api/stripe/{checkout,portal,webhook}/route.ts` |
| Firebase emulator suite | Local Auth + Firestore + Storage; toggled via env var | `firebase.json` + `src/lib/firebase.ts` |
| Error + 404 pages | Themed templates for `error.tsx` and `not-found.tsx` | `src/app/error.tsx`, `src/app/not-found.tsx` |
| SEO metadata | `metadataBase`, OpenGraph, Twitter card scaffold | `src/app/layout.tsx` |

### Scalability & data strategy

Start with **Firestore**. Reach for a dedicated analytics store when query patterns diverge from your app database — typically when aggregating millions of events or running analytical queries. Firestore is not the right tool for OLAP.

| Option | Reach for when |
|:-------|:---------------|
| **BigQuery** | Already in GCP — Firestore has a one-click BigQuery export extension |
| **ClickHouse** | High-volume event data, real-time aggregations |

## When to leave Firebase

If you outgrow Firebase, the exit cost depends on which piece is hurting:

- **Firestore costs scaling badly?** — migrating to Postgres means rewriting your data layer. Plan for this if you expect heavy writes.
- **Firebase Auth limits?** — relatively easy to swap for Clerk or Auth.js, since users can be exported.
- **App Hosting too constraining?** — moving to Cloud Run direct is a one-day job; the Next.js app itself is portable.
