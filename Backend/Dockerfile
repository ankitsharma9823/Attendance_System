FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./

RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY tsconfig.json ./
COPY src ./src

RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma generate
RUN npx tsc --outDir dist

FROM node:20-alpine AS runtime
WORKDIR /app

RUN apk add --no-cache tini

COPY package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/src/generated ./src/generated

ENV NODE_ENV=production

EXPOSE 4001

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/src/server.js"]
