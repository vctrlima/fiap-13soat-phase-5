---
name: Cross-Service Observability Skill
description: "Keep metrics, traces, and dashboards aligned whenever critical flows are changed"
---

# Cross-Service Observability Skill

## Objective

Ensure every critical flow change remains observable across services through coherent metrics, traces, and operational documentation.

## Apply When

- A core flow path changes (auth, upload, processing, status, notification).
- New retries, queue behavior, or latency-sensitive logic is added.
- Incident investigation reveals visibility gaps.
- Dashboard or metric naming is updated.

## Inputs

- Changed flow and impacted services.
- SLO-relevant signals (latency, errors, throughput, saturation).
- Existing dashboard and metric baseline.

## Mandatory Checks

1. Preserve correlation ID continuity across boundaries.
2. Update or add low-cardinality metrics for key business and technical signals.
3. Ensure `/metrics` endpoint remains healthy after changes.
4. Ensure traces are still exported with correct service identity.
5. Update observability docs and dashboard queries when metric semantics change.

## Implementation Guidance

- Reuse shared observability primitives from `packages/shared/src/observability`.
- Avoid high-cardinality labels unless strictly necessary.
- Tie each new metric to a concrete decision or alerting need.
- Keep troubleshooting notes in sync with new failure modes.

## Validation Commands

```bash
docker compose up -d --build
docker compose ps
npm run build
```

## Expected Output Format

1. Observability delta by service.
2. Added or changed metrics and trace points.
3. Dashboard and runbook updates.
4. Validation evidence and blind spots.
