import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import {
  correlationFromHeaders,
  initTracing,
  registry,
  stopTracing,
} from "@fiap-13soat/shared";
import Fastify from "fastify";
import jwt from "jsonwebtoken";
import { serviceMap } from "./application/ports/service-map.js";
import {
  requiresAuth,
  resolveRouteTarget,
} from "./domain/services/routing-policy.js";
import { proxyRequest } from "./interfaces/http/proxy.js";

const app = Fastify({ logger: true });
const jwtSecret = process.env.JWT_SECRET ?? "changeme-secret";
const gatewayRateLimitMax = Number(process.env.GATEWAY_RATE_LIMIT_MAX ?? 1200);
const gatewayRateLimitWindow =
  process.env.GATEWAY_RATE_LIMIT_WINDOW ?? "1 minute";

const bootstrap = async (): Promise<void> => {
  await initTracing("api-gateway");

  await app.register(cors, { origin: true });
  await app.register(helmet);
  await app.register(rateLimit, {
    max: gatewayRateLimitMax,
    timeWindow: gatewayRateLimitWindow,
  });
  await app.register(multipart);

  app.get("/health/live", async () => ({
    status: "ok",
    service: "api-gateway",
  }));
  app.get("/health/ready", async () => ({ status: "ready" }));
  app.get("/metrics", async (_, reply) => {
    reply.header("Content-Type", registry.contentType);
    return registry.metrics();
  });

  app.route({
    method: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    url: "/*",
    handler: async (request, reply) => {
      const correlationId = correlationFromHeaders(request.headers);
      reply.header("x-correlation-id", correlationId);

      try {
        let userHeader: { userId?: string; role?: string } = {};
        if (requiresAuth(request.url)) {
          const authHeader = request.headers.authorization;
          if (!authHeader) {
            return reply.code(401).send({ message: "missing auth header" });
          }

          const token = authHeader.replace("Bearer ", "");
          const decoded = jwt.verify(token, jwtSecret) as {
            sub: string;
            role: string;
          };
          userHeader = { userId: decoded.sub, role: decoded.role };
        }

        if (userHeader.userId) {
          request.headers["x-user-id"] = userHeader.userId;
        }
        if (userHeader.role) {
          request.headers["x-user-role"] = userHeader.role;
        }

        const suffix = request.url.split("?")[0];
        const targetKey = resolveRouteTarget(suffix);
        const target = { base: serviceMap[targetKey], suffix };
        await proxyRequest(
          request,
          reply,
          target.base,
          target.suffix +
            (request.url.includes("?") ? `?${request.url.split("?")[1]}` : ""),
        );
      } catch (error) {
        if ((error as Error).message === "route not found") {
          return reply.code(404).send({ message: "route not found" });
        }
        if ((error as Error).name === "TokenExpiredError") {
          return reply.code(401).send({ message: "token expired" });
        }
        if (
          (error as Error).name === "JsonWebTokenError" ||
          (error as Error).name === "NotBeforeError"
        ) {
          return reply.code(401).send({ message: "unauthorized" });
        }
        return reply
          .code(500)
          .send({
            message: "internal gateway error",
            details: (error as Error).message,
          });
      }
    },
  });

  await app.listen({ host: "0.0.0.0", port: Number(process.env.PORT ?? 3000) });
};

const shutdown = async (): Promise<void> => {
  await app.close();
  await stopTracing();
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

bootstrap().catch(async (error) => {
  app.log.error(error);
  await shutdown();
});
