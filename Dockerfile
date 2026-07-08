# Kakunin platform (control plane) — production container image.
#
# This builds the Next.js application. Kakunin depends on external managed
# services (Supabase, AWS KMS, S3 Object-Lock, Upstash, QStash, Stripe, and
# more — see .env.example). The container runs the app; you supply the service
# credentials at runtime via environment variables. It is NOT a self-contained
# platform — the canonical CA, key custody, and WORM audit are hosted services
# by design (see https://www.kakunin.ai/open-source).
#
#   docker build -t kakunin-core .
#   docker run --env-file .env.local -p 3000:3000 kakunin-core

# ---- deps ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- build ----
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build-time public env can be baked here if needed; secrets are provided at runtime.
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- runtime ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Run as an unprivileged user.
RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S nextjs -G nodejs

# Next.js standalone output: server + minimal node_modules, static assets, public/.
COPY --from=build /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
