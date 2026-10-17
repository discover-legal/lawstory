# Standalone Next.js image: build stage, then a slim non-root runtime. No entrypoint, no disk.
# The Node version must equal .nvmrc (the single source; __tests__/site/deploy.test.ts compares them).
FROM node:22.22.0-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Public build-time settings, inlined at build (README "Environment"). Render passes service env vars
# as build args. NEXT_PUBLIC_SITE_URL=https://discover.legal is what makes the build indexable.
ARG NEXT_PUBLIC_SITE_URL=""
ARG NEXT_PUBLIC_BOOKING_URL=""
ARG NEXT_PUBLIC_BIGLAW_DEMO_URL=""
ARG NEXT_PUBLIC_GA_ID=""
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_BOOKING_URL=$NEXT_PUBLIC_BOOKING_URL \
    NEXT_PUBLIC_BIGLAW_DEMO_URL=$NEXT_PUBLIC_BIGLAW_DEMO_URL \
    NEXT_PUBLIC_GA_ID=$NEXT_PUBLIC_GA_ID
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# `npm run build` also copies .next/static and public/ into .next/standalone (scripts/standalone-assets.mjs).
RUN npm run build

FROM node:22.22.0-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
# App files stay root-owned (read-only to the server); only Next's cache dir is writable.
COPY --from=build /app/.next/standalone ./
RUN mkdir -p .next/cache && chown node:node .next/cache
USER node
EXPOSE 3000
# Drop the base image's docker-entrypoint.sh: node is PID 1 and handles SIGTERM itself.
ENTRYPOINT []
CMD ["node", "server.js"]
