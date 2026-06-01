# ADR-001: EDA with SQS/SNS

## Status

Accepted

## Context

Need for resilient asynchronous processing with decoupling.

## Decision

Adopt SQS for work queues and SNS for domain events.

## Consequences

Improved elasticity and fault tolerance, with higher operational complexity.
