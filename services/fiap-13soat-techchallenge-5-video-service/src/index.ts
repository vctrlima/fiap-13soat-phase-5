import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import { initTracing, stopTracing } from "@fiap-13soat/shared";
import Fastify from "fastify";
import { initVideoSchema, pool } from "./infrastructure/database/postgres.js";
import { registerVideoRoutes } from "./interfaces/http/routes.js";

const app = Fastify({ logger: true, bodyLimit: 1024 * 1024 * 1024 });
const serviceRateLimitMax = Number(process.env.VIDEO_RATE_LIMIT_MAX ?? 300);
const serviceRateLimitWindow =
  process.env.VIDEO_RATE_LIMIT_WINDOW ?? "1 minute";
const maxUploadBytes = Number(
  process.env.VIDEO_MAX_UPLOAD_BYTES ?? 1024 * 1024 * 1024,
);

const bootstrap = async (): Promise<void> => {
  await initTracing("video-service");
  await initVideoSchema();
  await app.register(cors, { origin: true });
  await app.register(helmet);
  await app.register(rateLimit, {
    max: serviceRateLimitMax,
    timeWindow: serviceRateLimitWindow,
  });
  await app.register(multipart, {
    limits: {
      fileSize: maxUploadBytes,
      files: 1,
    },
  });

  registerVideoRoutes(app);

  await app.listen({ host: "0.0.0.0", port: Number(process.env.PORT ?? 3002) });
};

const shutdown = async (): Promise<void> => {
  await app.close();
  await pool.end();
  await stopTracing();
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

bootstrap().catch(async (error) => {
  app.log.error(error);
  await shutdown();
});
