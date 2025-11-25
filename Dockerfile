FROM denoland/deno:debian

WORKDIR /app

ENV TAILWIND_MODE=watch

COPY deno.json deno.lock package.json ./
COPY tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts eslint.config.js tailwind.config.js postcss.config.mjs index.html ./

# Preload npm deps so Vite CLI is available during build
RUN deno cache --node-modules-dir npm:vite

COPY src ./src
COPY public ./public

RUN deno run -A npm:vite build

EXPOSE 4173

CMD ["deno", "task", "preview", "--", "--host", "0.0.0.0", "--port", "4173", "--strictPort"]
