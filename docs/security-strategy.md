# Security Strategy

- JWT access token + rotating refresh token.
- Passwords hashed with Argon2.
- RBAC with ADMIN/USER roles.
- Helmet for header hardening and configurable CORS.
- Local Secrets Manager via Ministack for application secrets.
