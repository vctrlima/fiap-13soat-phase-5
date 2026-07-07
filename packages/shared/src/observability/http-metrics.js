import { metrics } from "./metrics.js";
const requestStartedAt = new WeakMap();
const resolveRouteLabel = (request) => {
  return (
    request.routeOptions?.url ??
    request.routerPath ??
    request.url ??
    "unknown"
  ).split("?")[0];
};
export const registerHttpMetrics = (app, serviceName) => {
  app.addHook("onRequest", (request, _reply, done) => {
    requestStartedAt.set(request, performance.now());
    done();
  });
  app.addHook("onResponse", (request, reply, done) => {
    const startedAt = requestStartedAt.get(request) ?? performance.now();
    const durationSeconds = (performance.now() - startedAt) / 1000;
    const route = resolveRouteLabel(request);
    const method = (request.method ?? "UNKNOWN").toUpperCase();
    const statusCode = String(reply.statusCode ?? 0);
    metrics.httpRequestsTotal.inc({
      service: serviceName,
      method,
      route,
      status_code: statusCode,
    });
    metrics.httpRequestDurationSeconds.observe(
      {
        service: serviceName,
        method,
        route,
        status_code: statusCode,
      },
      durationSeconds,
    );
    requestStartedAt.delete(request);
    done();
  });
};
