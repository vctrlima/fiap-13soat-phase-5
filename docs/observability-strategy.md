# Observability Strategy

- Structured JSON logs via Pino/Fastify.
- Prometheus metrics exposed on `/metrics`.
- OpenTelemetry traces exported to Jaeger (OTLP HTTP).
- Grafana dashboard automatically provisioned.

Minimum instrumented metrics:

- uploads_total
- processing_started_total
- processing_completed_total
- processing_failed_total
- processing_duration_seconds
- queue_size
- active_workers

Recommended operational metrics for scaling:

- Effective processing rate: `rate(processing_completed_total[5m])`
- Processing failure rate: `rate(processing_failed_total[5m])`
- Queue depth for scale triggering: `queue_size`
- Worker saturation per instance: `active_workers`
