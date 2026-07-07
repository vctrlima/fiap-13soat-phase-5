import client from "prom-client";
export declare const metrics: {
  httpRequestsTotal: client.Counter<string>;
  httpRequestDurationSeconds: client.Histogram<string>;
  uploadsTotal: client.Counter<string>;
  processingStartedTotal: client.Counter<string>;
  processingCompletedTotal: client.Counter<string>;
  processingFailedTotal: client.Counter<string>;
  processingDurationSeconds: client.Histogram<string>;
  queueSize: client.Gauge<string>;
  queueOldestMessageAgeSeconds: client.Gauge<string>;
  activeWorkers: client.Gauge<string>;
};
export declare const registry: client.Registry<"text/plain; version=0.0.4; charset=utf-8">;
