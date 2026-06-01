---
name: Reliable SQS Consumer Skill
description: "Apply robust consumption patterns for SQS workers with idempotency, retries, and safe ack behavior"
---

# Reliable SQS Consumer Skill

## Objective

Maintain reliable message consumption with correct acknowledgement timing, retry behavior, idempotency, and operational visibility.

## Apply When

- A consumer loop is changed.
- Retry, polling, or concurrency parameters are tuned.
- Message handling logic is added for new event types.
- DLQ strategy is introduced or modified.

## Inputs

- Queue URL and expected throughput.
- Current concurrency and max messages per poll.
- Error handling and retry requirements.

## Mandatory Checks

1. Delete message only after full successful processing.
2. Never mark idempotency state as processed when processing fails.
3. Ensure visibility timeout is compatible with processing duration.
4. Ensure polling failures apply bounded backoff.
5. Ensure poison messages can reach DLQ instead of blocking progress.

## Implementation Guidance

- Keep parse/validation errors isolated per message.
- Keep in-flight concurrency bounded.
- Emit metrics for active workers, failures, and queue depth.
- Separate template/content mapping from low-level consumer loop when possible.

## Validation Commands

```bash
npm run build
npm run test
docker compose config
```

## Expected Output Format

1. Consumer reliability change summary.
2. Ack, retry, idempotency behavior after change.
3. Operational tuning knobs and defaults.
4. Validation evidence and failure-mode risks.
