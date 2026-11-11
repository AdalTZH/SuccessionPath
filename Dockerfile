FROM node:20-bookworm-slim AS frontend-build

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM node:20-bookworm-slim AS backend-deps

WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

FROM node:20-bookworm-slim AS runtime

ENV NODE_ENV=production \
    PORT=4000

WORKDIR /app/backend
COPY --from=backend-deps /app/backend/node_modules ./node_modules
COPY backend/package.json backend/package-lock.json ./
COPY backend/src ./src
COPY backend/scripts ./scripts
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

USER node
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "src/server.js"]
