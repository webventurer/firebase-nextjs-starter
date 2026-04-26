# CLAUDE.md

This repo is a **scaffold**, not an app. It generates new projects via `scripts/create.sh`. Nothing here is meant to run on its own.

## Where things live

- `scripts/create.sh` — the entry point. Scaffolds Next.js, copies templates, installs deps, runs shadcn, sets up symlinks, inits git.
- `scripts/setup.sh` — links this starter's skills + docs into a scaffolded project's `.claude/` and `docs/`.
- `templates/` — source-of-truth files copied verbatim into every new project. **Edit these, not the scaffolded output.**
- `package.json` — the dep list copied into new projects. Adding a runtime dep here means it ships in every new app.
- `biome.json` — also copied verbatim.
- `stack.md` — the *why* (technology choices, trade-offs).
- `tech-spec.md` — the *how* (project structure, env vars, deployment).

## When making changes

- Bug in a scaffolded app's lib code → fix in `templates/src/lib/...`.
- Adding a new dependency the starter should ship → add to root `package.json`, then add the corresponding template file (if any) to `templates/` and reference it in `scripts/create.sh`'s `TEMPLATE_FILES` array.
- Changing the scaffold flow itself → `scripts/create.sh`.
- Updating the docs the README points at → `stack.md` / `tech-spec.md` (these are linked into scaffolded projects' `docs/` by `setup.sh`).

## Verifying changes

The only real test is running `scripts/create.sh <test-app>` against a sibling directory and checking the output builds. There is no test suite for the scaffold itself — the scaffolded app's smoke test (`templates/src/__tests__/smoke.test.ts`) only covers the copied lib code.

## Things not to confuse

- The empty-looking `.claude/` skills here are linked into projects you scaffold — they are not for working on this repo.
- `codefu` and `.semgrep` at the root are symlinks to a sibling repo, gitignored, and provide AI-assist tooling for the *consuming* project, not this one.
- `docs/` does not exist in this repo — it is created inside scaffolded child projects by `setup.sh`.
