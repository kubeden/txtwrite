# <img src="public/logo/logo.png" width="23" height="23"> TXTWrite

TXTWrite is an open-source markdown editor.

You can include it in your web project for free.

## Prerequisites

- deno: 2.5.6
- typescript: 5.9.2

## Getting Started

```
deno task dev        # Start Vite dev server
deno task build      # Type-check + build for production
deno task preview    # Preview the production build
deno task lint       # Run eslint over the project
deno task db:migrate:local # Apply Neon schema using .env.local
```

The Vite dev server prints the local URL, usually `http://localhost:5173`.

## Neon Backend

TXTWrite can run with Neon as the only backend:

- Neon Auth gates the app.
- Neon Data API saves documents, versions, sidebar state, tabs, active document,
  and preferences.
- Postgres RLS scopes every row to `auth.user_id()`.
- The existing editor still uses localStorage internally; a sync shell persists
  that state to Neon.

### Setup

1. Enable Neon Auth and Data API in a Neon project.
2. Copy `.env.example` to `.env.local`.
3. Fill in:

```
VITE_NEON_AUTH_URL=...
VITE_NEON_DATA_API_URL=...
DATABASE_URL=...
```

4. Apply the schema:

```
deno task db:migrate:local
```

5. Start the app:

```
deno task dev
```

The first signed-in user flow is conservative. If existing local documents are
found and Neon is empty, TXTWrite shows an import banner instead of uploading
automatically.

## Production Notes

- Deploy the static build in `dist`.
- Keep `DATABASE_URL` out of the browser; it is only used for migrations.
- `public/_headers` and `vercel.json` add CSP and standard security headers for
  common static hosts.
- The app stores the active workspace locally for editor compatibility, but
  clears it on sign out and when a different Neon Auth user signs in.

## Preview Automation

GitHub Actions can create Codex-authored PRs from trusted issue comments and
deploy PR previews to Kubernetes through the `kubeden/kubeden` GitOps repo.

Required secrets:

```
PROD_DATABASE_URL
PROD_VITE_NEON_AUTH_URL
PROD_VITE_NEON_DATA_API_URL
NEON_API_KEY
OPENAI_API_KEY
GITOPS_TOKEN
ZOT_REGISTRY_USERNAME
ZOT_REGISTRY_PASSWORD
```

Required variables:

```
NEON_PROJECT_ID
```

Optional variables override `agent.config.json` defaults:

```
NEON_PARENT_BRANCH_ID
NEON_DATABASE_NAME
NEON_ROLE_NAME
NEON_DEFAULT_TTL_HOURS
NEON_AUTH_PROVIDER
NEON_DATA_API_AUTH_PROVIDER
```

The PR preview workflow provisions or reuses a Neon branch, resolves
branch-specific Auth and Data API URLs, runs migrations, builds a Docker image
with those public URLs as build args, and pushes preview manifests to the
`txtwrite-previews` branch in the GitOps repo.

When a PR into `feat/neon-backend` is merged, the close workflow runs the
production migration with `PROD_DATABASE_URL`, builds and pushes
`registry.k6nis.dev/txtwrite/neon:latest`, updates the main `md` GitOps
deployment, and then removes the preview GitOps manifests and Neon branch.
Closing a PR without merging only removes the preview resources.

---

built by <a href="https://x.com/@kuberdenis">@kuberdenis</a> =)

and community:

- [@caluckenbach](https://github.com/caluckenbach)
