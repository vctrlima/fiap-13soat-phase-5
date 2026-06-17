# Local Run Guide

1. Prerequisites

- Docker + Docker Compose

2. Startup

```bash
docker compose up -d --build
```

3. Clean Restart (from zero)

Use this when you want to reset everything (containers, network, and volumes):

```bash
docker compose down -v --remove-orphans
docker compose up -d --build
```

The `ministack` ready script is idempotent and validates required resources on startup.

4. Health Validation

```bash
docker compose ps
```

5. Ports

- API: 3000
- Mailpit: 8025
- Grafana: 3006
- Prometheus: 9090
- Jaeger: 16686
