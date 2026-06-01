import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { initTracing, registry, stopTracing } from "@fiap-13soat/shared";
import Fastify from "fastify";
import {
  runConsumer,
  stopConsumer,
} from "./interfaces/consumers/sqs-consumer.js";

const app = Fastify({ logger: true });
const serviceRateLimitMax = Number(
  process.env.NOTIFICATION_RATE_LIMIT_MAX ?? 1200,
);
const serviceRateLimitWindow =
  process.env.NOTIFICATION_RATE_LIMIT_WINDOW ?? "1 minute";

const bootstrap = async (): Promise<void> => {
  await initTracing("notification-service");
  await app.register(cors, { origin: true });
  await app.register(helmet);
  await app.register(rateLimit, {
    max: serviceRateLimitMax,
    timeWindow: serviceRateLimitWindow,
  });

  app.get("/health/live", async () => ({
    status: "ok",
    service: "notification-service",
  }));
  app.get("/health/ready", async () => ({ status: "ready" }));
  app.get("/metrics", async (_, reply) => {
    reply.header("Content-Type", registry.contentType);
    return registry.metrics();
  });

  await app.listen({ host: "0.0.0.0", port: Number(process.env.PORT ?? 3005) });
  runConsumer().catch((error) => app.log.error(error));
};

const shutdown = async (): Promise<void> => {
  stopConsumer();
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
