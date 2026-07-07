import client from "prom-client";

client.collectDefaultMetrics();

export const metrics = {
  httpRequestsTotal: new client.Counter({
    name: "http_requests_total",
    help: "Total de requests HTTP por servico, rota e status",
    labelNames: ["service", "method", "route", "status_code"],
  }),
  httpRequestDurationSeconds: new client.Histogram({
    name: "http_request_duration_seconds",
    help: "Duracao das requests HTTP em segundos",
    labelNames: ["service", "method", "route", "status_code"],
    buckets: [0.01, 0.05, 0.1, 0.3, 1, 3, 10],
  }),
  uploadsTotal: new client.Counter({
    name: "uploads_total",
    help: "Total de uploads de video",
  }),
  processingStartedTotal: new client.Counter({
    name: "processing_started_total",
    help: "Total de processamentos iniciados",
  }),
  processingCompletedTotal: new client.Counter({
    name: "processing_completed_total",
    help: "Total de processamentos finalizados",
  }),
  processingFailedTotal: new client.Counter({
    name: "processing_failed_total",
    help: "Total de processamentos com falha",
  }),
  processingDurationSeconds: new client.Histogram({
    name: "processing_duration_seconds",
    help: "Duracao do processamento em segundos",
    buckets: [1, 5, 10, 30, 60, 120, 300],
  }),
  queueSize: new client.Gauge({
    name: "queue_size",
    help: "Quantidade de mensagens na fila",
  }),
  queueOldestMessageAgeSeconds: new client.Gauge({
    name: "queue_oldest_message_age_seconds",
    help: "Idade da mensagem mais antiga na fila em segundos",
  }),
  activeWorkers: new client.Gauge({
    name: "active_workers",
    help: "Quantidade de workers ativos",
  }),
};

export const registry = client.register;
