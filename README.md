# Firebase Starter

A modern Next.js + Firebase starter — Next.js 16 (App Router) on the frontend, Firebase Auth + Firestore + App Hosting on the backend, with Stripe, shadcn/ui, Tailwind v4, and Vitest wired up. Built around the *bundled* Firebase route — auth, database, hosting, and storage all live under one project. The trade-off is vendor lock-in (see [stack.md](stack.md)). For a modular alternative (Vite + Hono + Neon + Clerk + Drizzle), see the sibling [`app-starter`](https://github.com/webventurer/app-starter).

## Prerequisites

```bash
# GitHub CLI (for cloning private repos)
brew install gh
gh auth login

# pnpm (package manager)
brew install pnpm

# Firebase CLI (for project setup + deployment)
npm install -g firebase-tools
firebase login
```

## Quick start

```bash
gh repo clone webventurer/firebase-nextjs-starter
./firebase-nextjs-starter/scripts/create.sh my-app
```

This creates a new `my-app/` directory alongside the starter and:

1. Scaffolds a Next.js + TypeScript + Tailwind project (`create-next-app`)
2. Installs the full dep list (Firebase, Stripe, shadcn, Vitest, Biome, AWS SDK for R2)
3. Initialises shadcn/ui (new-york style, neutral base, lucide icons) with 11 components
4. Copies Firebase config (`firebase.json`, `firestore.rules`, `apphosting.yaml`) into the project root
5. Copies the lib helpers (`firebase.ts`, `firebase-admin.ts`, `firebase-storage.ts`, `r2.ts`, `stripe.ts`, `demo-config.ts`, `admin.ts`, API auth/admin-auth/responses helpers) into `src/lib/`
6. Wires up the auth layer — `AuthProvider` + `useAuth()` hook + `<AuthGuard>` + route groups `(public)` and `(auth)` with login/signup/dashboard pages, plus `verifyAdminAuth()` for admin-only routes
7. Sets up three Stripe routes — webhook, checkout, billing portal
8. Sets up Biome for linting + formatting (replaces ESLint)
9. Initialises a git repo with the first commit

## Claude Code setup

This project uses [codefu](https://github.com/webventurer/codefu) for AI-assisted development skills and commands. Add if not already cloned:

```bash
gh repo clone webventurer/codefu
add-codefu.sh  # if not there already
gh repo clone webventurer/firebase-nextjs-starter
cd firebase-nextjs-starter
```

## What's in this repo

| File | What it is | When to read it |
|:-----|:-----------|:----------------|
| [`scripts/create.sh`](scripts/create.sh) | Automated setup script — scaffolds Next.js, installs deps, configures Firebase + shadcn/ui + Biome | You don't — just run it |
| [`package.json`](package.json) | Declarative dependency list for the full stack — the script copies this into your new project | When you want to see exactly what gets installed |
| [`stack.md`](stack.md) | The *why* — explains why we chose Firebase-bundled over modular, what we considered, and what we rejected | Before starting a project, to understand the decisions |
| [`tech-spec.md`](tech-spec.md) | The *how* — project structure, Firebase project setup, env vars, deployment via App Hosting | During development, as a reference guide |
| [`templates/`](templates) | Source-of-truth files copied into every new project (Firebase config, lib helpers, configs) | When you want to change the default scaffold |

## After install

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Authentication and Firestore in the console
3. Update `.firebaserc` with your project ID
4. Copy `.env.example` to `.env.local` and fill in the values
5. Update `apphosting.yaml` with your public Firebase config
6. Run `pnpm dev` — the app should boot on `http://localhost:3000`

See [tech-spec.md](tech-spec.md) for the full setup walkthrough and deployment steps.

## Optional dependencies

These are not in `package.json` — add them only when needed:

```bash
# State management — when useState outgrows local state
pnpm add zustand

# Server state — only if you need cross-component caching beyond Next's fetch cache
pnpm add @tanstack/react-query

# Charts
pnpm add recharts

# Email (transactional)
pnpm add loops

# Analytics
pnpm add posthog-js
```

## Further reading

- [stack.md](stack.md) — the rationale behind every technology choice
- [tech-spec.md](tech-spec.md) — the actionable setup guide
- [app-starter](https://github.com/webventurer/app-starter) — the modular alternative (Vite + Hono + Neon + Clerk + Drizzle)
