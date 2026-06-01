# FIAP 13SOAT Tech Challenge 5 - Monorepo

Event-driven platform for video upload and asynchronous processing using hexagonal architecture and microservices.

## Stack

- Node.js LTS + TypeScript + Fastify
- PostgreSQL + Redis
- Local Ministack with AWS SDK v3 (S3, SQS, SNS, Secrets Manager)
- OpenTelemetry + Prometheus + Grafana + Jaeger
- Docker Compose

## Services

- fiap-13soat-techchallenge-5-api-gateway
- fiap-13soat-techchallenge-5-identity-service
- fiap-13soat-techchallenge-5-video-service
- fiap-13soat-techchallenge-5-processing-service
- fiap-13soat-techchallenge-5-status-service
- fiap-13soat-techchallenge-5-notification-service

## Structure

- services: each microservice is an independent npm workspace.
- services/fiap-13soat-techchallenge-5-\*: domain services.
- packages/shared: contracts, utilities, observability helpers, and AWS SDK v3 clients.
- docs: architecture docs, ADRs, and Mermaid diagrams.
- scripts: local bootstrap automations (including Ministack initialization).

## Local Startup

```bash
cp .env.example .env
npm run compose:up
```

## Useful Commands

```bash
npm run build
npm run test
npm run compose:logs
npm run compose:down
```

## Main Endpoints

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /videos/upload`
- `GET /status/videos/:videoId`
- `GET /status/history`
- `GET /status/videos/:videoId/download`

## End-to-End Flow (cURL)

1. Register

```bash
curl -X POST http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@fiap-13soat.dev","password":"StrongPass123!","role":"USER"}'
```

2. Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@fiap-13soat.dev","password":"StrongPass123!"}'
```

3. Upload

```bash
curl -X POST http://localhost:3000/videos/upload \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -F "video=@./sample.mp4"
```

4. Status

```bash
curl -H "Authorization: Bearer <ACCESS_TOKEN>" \
  http://localhost:3000/status/videos/<VIDEO_ID>
```

5. Download

```bash
curl -L -o result.zip \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  http://localhost:3000/status/videos/<VIDEO_ID>/download
```

6. Local Notification

- UI Mailpit: http://localhost:8025

## Observability

- Prometheus: http://localhost:9090
- Grafana: http://localhost:3006
- Jaeger: http://localhost:16686

## Resilience and TPS

- Configurable per-service rate limiting with `*_RATE_LIMIT_MAX` and `*_RATE_LIMIT_WINDOW`.
- API Gateway upstream timeout/retry with `GATEWAY_UPSTREAM_TIMEOUT_MS` and `GATEWAY_UPSTREAM_RETRIES`.
- Configurable SQS consumer throughput via `PROCESSING_WORKER_CONCURRENCY`, `PROCESSING_MAX_MESSAGES_PER_POLL`, `NOTIFICATION_WORKER_CONCURRENCY`, and `NOTIFICATION_MAX_MESSAGES_PER_POLL`.
- DLQ enabled for processing and notification queues to prevent invalid-message blocking.

## Detailed Documentation

See the `docs` folder.
