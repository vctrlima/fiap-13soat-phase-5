# Local Run Guide

1. Prerequisites

- Docker + Docker Compose

2. Startup

```bash
docker compose up -d --build
```

3. Health Validation

```bash
docker compose ps
```

4. Ports

- API: 3000
- Mailpit: 8025
- Grafana: 3006
- Prometheus: 9090
- Jaeger: 16686
