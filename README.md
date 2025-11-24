# TXTWrite React Rewrite

This package is a Vite-powered, fully client-side rewrite of TXTWrite that
removes the Next.js dependency. The editor, preview, document management, and
file sidebar logic from `src/` have been copied over so everything runs locally
with zero server calls or SaaS integrations.

## Getting Started (Deno)

```bash
cd react-rewrite
deno task dev        # Start Vite dev server
deno task build      # Type-check + build for production
deno task preview    # Preview the production build
deno task lint       # Run eslint over the project
```

Deno reads `package.json`/`deno.lock` to install the npm dependencies
automatically, so `deno task dev` is all you need after cloning.

## Project Notes

- All UI, hooks, utils, and styles were brought over from the original Next app
  and still live under `src/`.
- `@/` path aliases are configured in both `tsconfig*.json` and
  `vite.config.ts`.
- Tailwind 4 and the project-specific global styles (`globals.css`, CodeMirror,
  markdown, toolbar) are imported once in `src/main.tsx`.
- Theme toggling is handled locally via `src/contexts/ThemeContext.js`,
  mirroring the old `next-themes` behavior.
- The app only uses `localStorage` for persistence, so it’s safe to run
  completely offline. Notion, Stripe, and other remote integrations have been
  removed.
