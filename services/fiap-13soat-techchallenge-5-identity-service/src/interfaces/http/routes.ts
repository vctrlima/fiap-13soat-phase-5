import { correlationFromHeaders, registry } from "@fiap-13soat/shared";
import type { FastifyInstance } from "fastify";
import {
  loginUser,
  logout,
  refreshLogin,
  registerUser,
} from "../../application/use-cases/auth-use-cases.js";

export const registerIdentityRoutes = (app: FastifyInstance): void => {
  app.get("/health/live", async () => ({
    status: "ok",
    service: "identity-service",
  }));
  app.get("/health/ready", async () => ({ status: "ready" }));
  app.get("/metrics", async (_, reply) => {
    reply.header("Content-Type", registry.contentType);
    return registry.metrics();
  });

  app.post("/auth/register", async (request, reply) => {
    try {
      const body = request.body as {
        email: string;
        password: string;
        role?: "ADMIN" | "USER";
      };
      const result = await registerUser({
        email: body.email,
        password: body.password,
        role: body.role,
        correlationId: correlationFromHeaders(
          request.headers as Record<string, unknown>,
        ),
      });
      reply.code(201).send(result);
    } catch (error) {
      reply.code(400).send({ message: (error as Error).message });
    }
  });

  app.post("/auth/login", async (request, reply) => {
    try {
      const body = request.body as { email: string; password: string };
      const result = await loginUser(body);
      reply.send(result);
    } catch (error) {
      reply.code(401).send({ message: (error as Error).message });
    }
  });

  app.post("/auth/refresh", async (request, reply) => {
    try {
      const body = request.body as { refreshToken: string };
      const result = await refreshLogin(body.refreshToken);
      reply.send(result);
    } catch (error) {
      reply.code(401).send({ message: (error as Error).message });
    }
  });

  app.post("/auth/logout", async (request, reply) => {
    const body = request.body as { refreshToken: string };
    await logout(body.refreshToken);
    reply.code(204).send();
  });
};
