# Standalone Next.js image: build stage, then a slim non-root runtime. No entrypoint script, no disk.
FROM node:22.22.0-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Public build-time settings, inlined into the client bundle (read by pages from S6/S7 on; see README).
ARG NEXT_PUBLIC_BOOKING_URL=""
ARG NEXT_PUBLIC_BIGLAW_DEMO_URL=""
ARG NEXT_PUBLIC_GA_ID=""
ENV NEXT_PUBLIC_BOOKING_URL=$NEXT_PUBLIC_BOOKING_URL \
    NEXT_PUBLIC_BIGLAW_DEMO_URL=$NEXT_PUBLIC_BIGLAW_DEMO_URL \
    NEXT_PUBLIC_GA_ID=$NEXT_PUBLIC_GA_ID
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN mkdir -p public && npm run build

FROM node:22.22.0-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
# App files stay root-owned (read-only to the server); only Next's cache dir is writable.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
RUN mkdir -p .next/cache && chown node:node .next/cache
USER node
EXPOSE 3000
CMD ["node", "server.js"]
