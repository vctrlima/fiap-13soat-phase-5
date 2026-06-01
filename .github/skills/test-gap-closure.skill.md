---
name: Test Gap Closure Skill
description: "Close high-risk testing gaps with targeted unit, integration, and flow-level validations"
---

# Test Gap Closure Skill

## Objective

Prioritize and implement tests that reduce business and operational risk, especially around async processing, auth boundaries, and error handling.

## Apply When

- A bug fix is merged without regression coverage.
- A critical business flow is changed.
- A service has low or no effective coverage in core logic.
- CI catches flaky behavior or intermittent failures.

## Inputs

- Target flow.
- Risk category (security, data integrity, reliability, latency).
- Desired test level (unit, integration, e2e-like local flow).

## Mandatory Checks

1. Cover success and at least one realistic failure path.
2. Prefer deterministic data setup.
3. Avoid brittle assertions on irrelevant internals.
4. Verify cross-service contract behavior when events are involved.
5. Include operational regressions (timeouts, retries, unauthorized, not found) when applicable.

## Implementation Guidance

- Start from highest-risk paths, not from easiest files.
- Add minimal fixtures to keep tests fast and maintainable.
- Use integration tests only where infrastructure behavior matters.
- Report uncovered residual risk explicitly.

## Validation Commands

```bash
npm run test
npm run test:coverage
```

## Expected Output Format

1. Risk matrix of covered scenarios.
2. Added or modified tests.
3. Test run results summary.
4. Remaining gaps ordered by risk.
