FROM --platform=$BUILDPLATFORM denoland/deno:debian AS builder

WORKDIR /app

ENV TAILWIND_MODE=build
ARG VITE_NEON_AUTH_URL
ARG VITE_NEON_DATA_API_URL
ENV VITE_NEON_AUTH_URL=$VITE_NEON_AUTH_URL
ENV VITE_NEON_DATA_API_URL=$VITE_NEON_DATA_API_URL

COPY deno.json deno.lock package.json ./
COPY tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts eslint.config.js tailwind.config.js postcss.config.mjs index.html ./

# Preload npm deps so Vite CLI is available during build
RUN deno cache --node-modules-dir npm:vite

COPY src ./src
COPY public ./public

RUN test -n "$VITE_NEON_AUTH_URL" && test -n "$VITE_NEON_DATA_API_URL"
RUN deno run -A npm:vite build

FROM --platform=$TARGETPLATFORM denoland/deno:debian

WORKDIR /app

ENV PORT=4173

COPY --from=builder /app/dist ./dist
COPY serve.ts ./serve.ts

EXPOSE 4173

CMD ["deno", "run", "--allow-net", "--allow-read=/app/dist", "--allow-env=PORT", "serve.ts"]
