import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { initTracing, loadAppSecrets, stopTracing } from "@fiap-13soat/shared";
import Fastify from "fastify";
import {
  initIdentitySchema,
  pool,
} from "./infrastructure/database/postgres.js";
import { registerIdentityRoutes } from "./interfaces/http/routes.js";

const app = Fastify({ logger: true });
const serviceRateLimitMax = Number(process.env.IDENTITY_RATE_LIMIT_MAX ?? 600);
const serviceRateLimitWindow =
  process.env.IDENTITY_RATE_LIMIT_WINDOW ?? "1 minute";

const bootstrap = async (): Promise<void> => {
  const secrets = await loadAppSecrets();
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? secrets.JWT_SECRET;
  process.env.JWT_REFRESH_SECRET =
    process.env.JWT_REFRESH_SECRET ?? secrets.JWT_REFRESH_SECRET;

  await initTracing("identity-service");
  await initIdentitySchema();

  await app.register(cors, { origin: true });
  await app.register(helmet);
  await app.register(rateLimit, {
    max: serviceRateLimitMax,
    timeWindow: serviceRateLimitWindow,
  });

  registerIdentityRoutes(app);

  const port = Number(process.env.PORT ?? 3001);
  await app.listen({ host: "0.0.0.0", port });
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
