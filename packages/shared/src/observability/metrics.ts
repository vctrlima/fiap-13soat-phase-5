import client from "prom-client";

client.collectDefaultMetrics();

export const metrics = {
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
  activeWorkers: new client.Gauge({
    name: "active_workers",
    help: "Quantidade de workers ativos",
  }),
};

export const registry = client.register;
