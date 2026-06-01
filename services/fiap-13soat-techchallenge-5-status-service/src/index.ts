import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { initTracing, stopTracing } from "@fiap-13soat/shared";
import Fastify from "fastify";
import { redis } from "./infrastructure/cache/redis.js";
import { initStatusSchema, pool } from "./infrastructure/database/postgres.js";
import { registerStatusRoutes } from "./interfaces/http/routes.js";

const app = Fastify({ logger: true });
const serviceRateLimitMax = Number(process.env.STATUS_RATE_LIMIT_MAX ?? 1200);
const serviceRateLimitWindow =
  process.env.STATUS_RATE_LIMIT_WINDOW ?? "1 minute";

const bootstrap = async (): Promise<void> => {
  await initTracing("status-service");
  await initStatusSchema();
  await app.register(cors, { origin: true });
  await app.register(helmet);
  await app.register(rateLimit, {
    max: serviceRateLimitMax,
    timeWindow: serviceRateLimitWindow,
  });

  registerStatusRoutes(app);

  await app.listen({ host: "0.0.0.0", port: Number(process.env.PORT ?? 3004) });
};

const shutdown = async (): Promise<void> => {
  await app.close();
  await pool.end();
  redis.disconnect();
  await stopTracing();
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

bootstrap().catch(async (error) => {
  app.log.error(error);
  await shutdown();
});
