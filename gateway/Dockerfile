FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN npm ci || yarn install --frozen-lockfile || pnpm install --frozen-lockfile

COPY tsconfig.json ./
COPY src ./src

# PROTO_DIR will be mounted at runtime via docker-compose as /app/proto
ENV PROTO_DIR=/app/proto

RUN npm run build

EXPOSE 8080
CMD ["npm", "start"]