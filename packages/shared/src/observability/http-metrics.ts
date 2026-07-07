import { metrics } from "./metrics.js";

const requestStartedAt = new WeakMap<object, number>();

type HttpMetricRequest = {
  method?: string;
  url?: string;
  routerPath?: string;
  routeOptions?: {
    url?: string;
  };
};

type HttpMetricReply = {
  statusCode?: number;
};

type HttpMetricApp = {
  addHook: (
    hook: "onRequest" | "onResponse" | "preHandler" | "onSend" | "onError",
    handler: (...args: any[]) => void,
  ) => void;
};

const resolveRouteLabel = (request: HttpMetricRequest): string => {
  return (
    request.routeOptions?.url ??
    request.routerPath ??
    request.url ??
    "unknown"
  ).split("?")[0];
};

export const registerHttpMetrics = (
  app: HttpMetricApp,
  serviceName: string,
): void => {
  app.addHook(
    "onRequest",
    (request: object, _reply: object, done: () => void) => {
      requestStartedAt.set(request, performance.now());
      done();
    },
  );

  app.addHook(
    "onResponse",
    (request: HttpMetricRequest, reply: HttpMetricReply, done: () => void) => {
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
    },
  );
};
