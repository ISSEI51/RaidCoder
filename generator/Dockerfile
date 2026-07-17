# RaidCoder generator — AI問題生成・週ローテーション CLI
# Lightsail 上で cron から `docker compose run --rm generator rotate` として実行する

FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist

# コマンドは引数で渡す: generate | rotate | finalize --week <n> | activate --week <n>
ENTRYPOINT ["node", "dist/index.js"]
CMD ["rotate"]
