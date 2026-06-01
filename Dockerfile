# ==========================
# 构建阶段 (Builder)
# ==========================
FROM node:22-alpine AS builder

WORKDIR /app

# 启用 corepack 提供的 pnpm
RUN corepack enable

# 编译 better-sqlite3 原生模块所需的构建依赖
RUN apk add --no-cache --virtual .build-deps build-base python3

# 先复制包管理文件以利用层缓存
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# 复制源码并构建（Next.js standalone 输出）
COPY . .
RUN pnpm build

# 清理临时构建依赖
RUN apk del .build-deps

# ==========================
# 生产阶段 (Runner)
# ==========================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# standalone 产物（含已 trace 的依赖）
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# 显式保证 better-sqlite3 原生 binding 存在（serverExternalPackages 不打包它）
COPY --from=builder /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3

EXPOSE 3000

CMD ["node", "server.js"]
