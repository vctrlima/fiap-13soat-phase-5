FROM node:22-alpine

RUN apk add --no-cache ffmpeg zip curl

WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages ./packages
COPY services ./services

RUN npm ci && npm run build

ARG SERVICE_PATH
ENV SERVICE_PATH=${SERVICE_PATH}

CMD ["sh", "-c", "node ${SERVICE_PATH}/dist/index.js"]
