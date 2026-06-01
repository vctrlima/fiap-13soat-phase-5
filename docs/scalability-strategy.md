# Scalability Strategy

- API Gateway, Video Service, and Status Service scale horizontally without session state.
- Processing Service is stateless, with parallelism per replica and natural queue partitioning.
- Redis reduces PostgreSQL read pressure for status queries.
- S3 buckets decouple storage from compute capacity.

## TPS Targets

- Target gateway TPS: 20 req/s per instance for mixed traffic (1200 req/min per IP).
- Target upload TPS: 5 req/s per instance (I/O and payload-heavy route).
- Target status/query TPS: 20 req/s per instance, with Redis cache to absorb bursts.
- Target async processing throughput: `PROCESSING_WORKER_CONCURRENCY * replicas` concurrent messages.
- Target notification throughput: `NOTIFICATION_WORKER_CONCURRENCY * replicas` concurrent sends.

## Scale and Resilience Controls

- Per-service rate limiting via variables (`*_RATE_LIMIT_MAX` and `*_RATE_LIMIT_WINDOW`).
- Idempotent timeout/retry in the gateway for upstream calls (`GATEWAY_UPSTREAM_TIMEOUT_MS`, `GATEWAY_UPSTREAM_RETRIES`).
- SQS consumption with configurable concurrency (`PROCESSING_WORKER_CONCURRENCY`, `NOTIFICATION_WORKER_CONCURRENCY`).
- Batch reads with configurable `MaxNumberOfMessages` to improve queue draining during peaks.
- Exponential backoff in consumer polling to avoid aggressive loops during outages.
- DLQ with redrive policy for processing and notification after multiple retries.

## Capacity Planning Guideline

- Initial service TPS tuning should consider CPU/memory per pod and P95 latency.
- Increase horizontal replicas before raising per-instance limits to avoid local bottlenecks.
- Scale consumers based on queue depth (`queue_size`) and message dwell time.
- Consider the system healthy when `processing_completed_total / processing_started_total` stays stable over time.
