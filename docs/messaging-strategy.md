# Messaging Strategy

- SQS `video-processing` for resilient asynchronous execution.
- SQS `video-notification` for notification dispatch.
- SNS `video-domain-events` for domain event publishing.
- Versioned events with correlationId, eventId, timestamp, and version.
