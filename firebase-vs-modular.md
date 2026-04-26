# Firebase vs modular: when each wins

Two ways to build a Next.js SaaS:

- **Bundled (this starter)** — Firebase Auth + Firestore + App Hosting + Storage under one project
- **Modular ([app-starter](https://github.com/webventurer/app-starter))** — Hono + Clerk + Drizzle + Neon + Railway + R2

Most stack debates frame this as old-vs-new or simple-vs-advanced. Both are wrong. <mark>The real distinction is *bundled* vs *modular* — how tightly the pieces are integrated, and what that integration costs you in lock-in.</mark>

Firebase isn't "more advanced" than the modular stack — it's more **bundled**. Auth, database, hosting, storage, realtime, and offline sync all live under one project. The cost is vendor lock-in: <mark>Firestore's data model doesn't translate to anything else, so leaving Firebase later means a rewrite, not a port.</mark>

## At a glance

| Concern | Firebase (this starter) | Neon + Clerk + Drizzle ([app-starter](https://github.com/webventurer/app-starter)) |
|:--------|:------------------------|:--------------------------------------------|
| **Database** | Firestore (NoSQL document store) | Postgres |
| **Auth** | Firebase Auth (built-in) | Clerk (third-party SaaS) |
| **Realtime** | Yes — Firestore listeners | No — would need a separate service |
| **Storage** | Yes — Firebase Storage | No — bring your own (S3, R2) |
| **Edge functions** | Yes — Cloud Functions | No (Hono runs anywhere though) |
| **Offline support** | Yes — Firestore offline cache | No |
| **Pricing model** | Pay per read/write/storage | Pay for compute |
| **Vendor lock-in** | **High** — proprietary APIs | Low — standard Postgres |

## What bundled actually buys you

Six things Firebase gives you that the modular stack can't easily replicate.

### 1. Realtime + offline as primitives, not glue

Firestore listeners stream changes to every connected client. The SDK caches reads and queues writes when offline, syncing on reconnect.

To match this with the modular stack you'd add **Pusher or Ably** for realtime, plus **custom IndexedDB sync** for offline. Both are tractable, but keeping three caches consistent (server, client, IndexedDB) is its own project.

### 2. Auth + DB security in one language

Firestore rules use `request.auth.uid` directly. Authorisation lives next to the data:

```
match /users/{userId} {
  allow read, write: if request.auth.uid == userId;
}
```

With Clerk + Drizzle, the auth check sits in your Hono route, then the user ID flows into the Drizzle query. Same logic, written twice — once at the route boundary, once in the query. Forget one and you leak data. <mark>Security duplicated across N routes is N places to get it wrong.</mark>

### 3. No backend for typical CRUD

The Firestore client SDK reads and writes the database directly (rules enforce auth). Adding a favourites feature might be: write to `users/{uid}/favourites/{itemId}` from the client. Done.

The same feature with Hono + Drizzle: write a `POST /favourites` route, validate the body with Zod, check auth, run a Drizzle insert, return JSON. Test it. Version it. Repeat for every feature.

### 4. Storage that respects auth rules

Firebase Storage uses the same rules language as Firestore — uploads to `/users/{uid}/avatars` are allowed because `request.auth.uid == uid`.

R2 or S3 require presigned URLs from a backend that re-checks auth, or a permissive bucket policy with prayer.

### 5. Mobile-ready out of the box

Firebase has first-class iOS and Android SDKs that share auth + offline cache with the web app. Build the native app later and the same auth and data layer just work.

The modular stack would need a custom mobile backend, *or* a generic API your iOS app talks to — which then needs auth, rate limits, and validation duplicated from the web.

### 6. One vendor relationship

Firebase = one bill, one dashboard, one status page, one support contract.

Modular = roughly six vendors (Hono is OSS, but Clerk + Neon + Railway + Loops + PostHog + Stripe = six SaaS relationships). Six places to be billed surprises. Six status pages oncall has to know about.

## What bundled costs you

### 1. Vendor lock-in is real

Firestore's data model doesn't translate to Postgres. Documents-with-subcollections vs normalised tables-with-joins are fundamentally different shapes. <mark>Leaving Firebase later means rewriting the data layer, not porting it.</mark>

This isn't theoretical — it's the single biggest reason teams regret Firebase choices three years in.

### 2. NoSQL ergonomics

No joins. Denormalisation by default. Complex queries (multi-condition filters, aggregations) are awkward and often need extra composite indexes. Reach for Firestore when your access patterns are simple and known up-front; reach for Postgres when you need ad-hoc flexibility.

### 3. Per-read pricing scales unpredictably

Firestore charges per document read. A poorly-bound query that reads 10K documents on every page load can rack up real money fast. Postgres on Railway or Neon charges for compute, which scales more predictably as you add caching.

### 4. Less type safety in the data layer

Drizzle gives you fully-typed SQL queries. Firestore's TypeScript story is `as Type` casts and runtime Zod validation. Both work; only one catches schema drift at compile time.

## What modular wins on

| Concern | Modular wins because |
|:--------|:---------------------|
| **Standard SQL** | Postgres is portable. You can switch hosts (Neon → Supabase → RDS) in a weekend |
| **Type safety** | Drizzle types your queries; runtime Zod is optional, not load-bearing |
| **Fine-grained scaling** | Pay for compute, not per-read — predictable as traffic grows |
| **Best-of-breed picks** | Clerk's auth UX beats Firebase's. Loops' email beats Firebase Functions + SendGrid. You can swap any piece |
| **No NoSQL gymnastics** | Joins. Aggregations. Migrations. SQL has solved data modelling |

## What modular costs you

| Cost | What it means |
|:-----|:--------------|
| **Six vendors** | More bills, more outage feeds, more dashboards. Compounds with team size |
| **Glue code** | Realtime, offline, storage auth — each needs an integration you write and maintain |
| **No mobile SDK story** | If you ever go native, you build an API + auth + offline cache for that surface |
| **Auth security duplicated** | Every API route re-implements the same auth check; one mistake leaks data |

## When to pick which

**Pick Firebase (this starter) when:**

- You want auth + database + realtime + storage bundled, not glued together yourself
- You're shipping a mobile-first or offline-capable app
- You want to skip writing a backend for typical CRUD
- Time-to-launch matters more than long-term portability
- You're comfortable with NoSQL data modelling

**Pick modular ([app-starter](https://github.com/webventurer/app-starter)) when:**

- You want standard Postgres so you can switch hosting providers later
- You want stronger type guarantees through your data layer (Drizzle)
- You expect to outgrow Firebase's pricing model on heavy reads
- None of the bundled wins (realtime, offline, mobile) apply to your product

<mark>The honest default for a typical SaaS dashboard with no realtime/offline/mobile needs is **modular**.</mark> Firebase earns its place when its bundle solves an integration problem you'd otherwise have to solve yourself.

## Things this comparison doesn't decide

| Tool | Why it's orthogonal |
|:-----|:--------------------|
| **Stripe** | Both stacks use it the same way |
| **PostHog** | Drop-in regardless of backend |
| **shadcn/ui + Tailwind** | Both starters ship this |
| **Next.js** | Firebase App Hosting is built for it; modular can use it too (or Vite for app-only surfaces) |

The real choice is about: realtime, offline, mobile, vendor count, lock-in tolerance. Pick those first, the rest follows.
