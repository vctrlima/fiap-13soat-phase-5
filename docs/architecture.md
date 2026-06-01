# Architecture

The solution applies Hexagonal Architecture across all services, tactical DDD for entities and domain events, and EDA for decoupled processing.

## Key Decisions

- Write/read responsibilities are separated (lightweight CQRS for status/history).
- Asynchronous SQS processing absorbs bursts and avoids request loss.
- Worker idempotency is handled through `processed_events`.
- Processing retries use exponential backoff.
- Configurable DLQ for invalid messages.
- Security via JWT + refresh token + Argon2 + basic RBAC.

## Context

See the diagrams in `docs/diagrams`.
