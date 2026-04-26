# Integrated vs modular: when each wins

Two ways to build a Next.js SaaS:

- **Integrated (this starter)** — Firebase Auth + Firestore + App Hosting + Storage under one project
- **Modular ([app-starter](https://github.com/webventurer/app-starter))** — Hono + Clerk + Drizzle + Neon + Railway + R2

Most stack debates frame this as old-vs-new or simple-vs-advanced. Both are wrong. <mark>The real distinction is *integrated* vs *modular* — how tightly the pieces are bound together.</mark> Auth, database, hosting, and storage either live under one project (integrated: proprietary APIs, vendor lock-in) or are picked individually and wired together (modular: glue code, multiple vendor relationships). Each side wins on things the other can't easily replicate.

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

## What integrated buys you

Six things hard to replicate with the modular stack.

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

## What modular buys you

Five things hard to replicate with the integrated stack.

### 1. Data portability

Postgres is the default for a reason — schema migrations, joins, aggregations, window functions are all standard. You can switch hosts (Neon → Supabase → RDS) without rewriting the data layer; it travels with you.

Firestore's data model is documents-with-subcollections. <mark>Leaving Firebase later means rewriting every query against a relational schema, not porting it.</mark> Modular keeps that exit door open from day one.

### 2. Type-safe queries

Drizzle types your queries against your schema at compile time. Rename a column and TypeScript flags every broken query before the app boots. Firestore's TypeScript story is `as Type` casts after `.data()` plus runtime Zod — both work, but only one catches schema drift before you ship.

### 3. Predictable scaling costs

Postgres on Railway or Neon charges for compute. Add caching and traffic doesn't directly multiply your bill. Firestore charges per document read — a poorly-bound query that reads 10K documents on every page load can rack up real money fast, and the fix is usually rearchitecting your data model.

### 4. Best-of-breed pieces, swappable

Each vendor in the modular stack is independently picked for its job. Clerk's auth UX (multi-factor, social, organisations) beats Firebase Auth out of the box. Loops or Resend handle product email better than Firebase Functions + SendGrid. Don't like one? Swap it without touching the others — lock-in is per-piece, not per-stack.

### 5. Standard data modelling

Joins. Aggregations. Migrations. Multi-condition filters without composite indexes. SQL has solved relational data modelling — the tools, books, and Stack Overflow answers all assume it. Firestore makes you model collections to suit access patterns up front; if access patterns change later, the data layer changes too.

## When to pick which

**Pick integrated (this starter) when:**

- You need realtime, offline, or mobile — these are hardest to bolt on later
- You want to skip writing a backend for typical CRUD
- A single vendor (one bill, one dashboard, one support contract) is a feature, not a constraint
- Shipping the product matters more than keeping the data layer portable
- You're comfortable with NoSQL data modelling

**Pick modular ([app-starter](https://github.com/webventurer/app-starter)) when:**

- You need standard SQL — joins, aggregations, migrations, ad-hoc queries
- You want compile-time type safety in your data layer
- Per-read pricing worries you and you expect heavy traffic
- Data portability matters (cloud-switch insurance)
- You'd rather pick best-of-breed for each piece than accept what comes in the box

If wins on both sides apply to your product, prioritise the *unforgiving* ones: realtime, offline, and mobile are hard to bolt on after you've shipped (lean integrated); SQL portability and predictable scaling are hard to retrofit (lean modular). The softer wins (DX preferences, vendor count) shouldn't drive the choice.

## Ship fast, port later

A common pragmatic frame: pick integrated, ship the SaaS, validate the idea, port to modular if costs mount up. <mark>Most of the traditional "migration tax" argument has weakened — Claude Code (and similar AI tooling) can rewrite a Firestore data layer to Postgres mechanically, query by query, when the data shape is rectangular.</mark> The rewrite-every-query work that used to require senior engineers doing it by hand is no longer that. The cost-of-being-wrong on "ship integrated first" has dropped.

That said, here's how to actually make this play work.

### Hedges that earn the right to port later

1. Build behind a thin **repository layer** so swapping Firestore for Postgres later doesn't touch product code — just the layer beneath it.
2. Don't lean on Firestore-only features (realtime listeners, offline cache, deep subcollections) unless the product genuinely needs them. These are the parts that don't auto-port — they're rebuilt UX, not rewritten queries.
3. Keep the data shape **rectangular** (rows-and-columns; could be Postgres if you squint) so the AI port has clean targets.
4. Set a **cost trigger** (a spend threshold, or per-active-user cost) that kicks off migration planning *before* it becomes a crisis, not after.

### Honest take

The "ship fast, port later" plan works best for SaaS that doesn't actually lean on Firestore's specific strengths. For those products, the modular stack is easier to wire up than you think — and saves the migration tax entirely. If you genuinely need realtime, offline, or mobile, Firebase is the right call *and* the migration becomes much harder (those features don't auto-port), so plan to stay rather than plan to leave.

### The other migration trigger

Costs aren't the only thing that pushes teams off Firebase. **Team frustration** is the more common one — engineers hitting NoSQL walls (wanting joins, aggregations, type-safe queries), morale erosion, slow feature shipping after the initial speed win. That trigger comes earlier than cost and is harder to predict. Worth checking whether the team has prior NoSQL experience or is learning Firestore mid-build — the second case bites earlier.

## Things this comparison doesn't decide

| Tool | Why it's orthogonal |
|:-----|:--------------------|
| **Stripe** | Both stacks use it the same way |
| **PostHog** | Drop-in regardless of backend |
| **shadcn/ui + Tailwind** | Both starters ship this |
| **Next.js** | Firebase App Hosting is built for it; modular can use it too (or Vite for app-only surfaces) |

The real choice is: realtime, offline, mobile, vendor count, lock-in tolerance, data portability. Pick those first; the rest follows.
