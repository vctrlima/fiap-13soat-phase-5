---
name: Event Contract Evolution Skill
description: "Evolve domain event contracts safely with backward compatibility and consumer impact checks"
---

# Event Contract Evolution Skill

## Objective

Change domain event contracts without breaking producers/consumers, preserving event envelope standards and compatibility strategy.

## Apply When

- A new event is introduced.
- Event payload fields are added, renamed, or removed.
- Event metadata or versioning strategy changes.
- A consumer starts depending on new event fields.

## Inputs

- Event names impacted.
- Producer and consumer services.
- Compatibility target (backward compatible or breaking).

## Mandatory Checks

1. Keep envelope fields present: `eventId`, `correlationId`, `timestamp`, `version`, `eventName`, `payload`.
2. For non-breaking changes, only add optional fields.
3. For breaking changes, introduce a versioned event strategy and migration plan.
4. Update shared types and all affected consumers.
5. Confirm correlation ID continuity through publish and consume paths.

## Implementation Guidance

- Treat `packages/shared/src/types/events.ts` as canonical source of event names.
- Keep event factory behavior stable in `packages/shared/src/events/factory.ts`.
- Avoid consumer assumptions that force strict payload shape without fallback.
- Document contract updates in messaging docs.

## Validation Commands

```bash
npm run build
npm run test
docker compose config
```

## Expected Output Format

1. Contract change and compatibility level.
2. Producer and consumer impact map.
3. Files updated in shared and services.
4. Validation evidence and migration risks.
