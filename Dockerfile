FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl fontconfig fonts-noto-cjk && rm -rf /var/lib/apt/lists/* && npm install -g pnpm@9.12.3
WORKDIR /app
COPY . .
ENV DATABASE_URL=postgresql://build@localhost/build
RUN pnpm install --frozen-lockfile && pnpm db:generate && pnpm build
ENV NODE_ENV=production DEV_AUTH=false
CMD ["node", "apps/api/dist/main.js"]
