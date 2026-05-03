FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY artifacts/qawi-web ./artifacts/qawi-web

RUN pnpm install --filter @workspace/qawi-web --frozen-lockfile
RUN pnpm --filter @workspace/qawi-web run build

FROM nginx:alpine
COPY --from=builder /app/artifacts/qawi-web/dist /usr/share/nginx/html
COPY artifacts/qawi-web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
