---
name: Auth Boundary Consistency Skill
description: "Preserve consistent authorization behavior across API Gateway and downstream services"
---

# Auth Boundary Consistency Skill

## Objective

Guarantee that authentication and authorization boundaries are consistent across gateway and services, avoiding endpoint exposure or inconsistent policy enforcement.

## Apply When

- A protected route is added or changed.
- JWT validation logic changes in gateway or service.
- A service starts consuming identity headers (`x-user-id`, `x-user-role`).
- Access policy for history, status, or download endpoints is changed.

## Inputs

- Target routes and methods.
- Expected auth mode per route (public, authenticated, role-based).
- Impacted services.

## Mandatory Checks

1. Confirm route policy in gateway and in downstream service.
2. Ensure no private data endpoint is left with optional auth by mistake.
3. Ensure JWT error responses do not leak secrets.
4. Ensure user identity propagation headers are set only after successful token validation.
5. Validate consistent behavior for `401`, `403`, and `404` paths.

## Implementation Guidance

- Keep business authorization in service layer where possible.
- Keep gateway focused on boundary concerns and routing.
- Prefer explicit route policy lists over implicit behavior.
- Update security docs when behavior changes.

## Validation Commands

```bash
npm run build
npm run test
docker compose config
```

## Expected Output Format

1. Boundary change summary.
2. Files changed and why.
3. Public/protected route matrix after the change.
4. Validation evidence and remaining risks.
