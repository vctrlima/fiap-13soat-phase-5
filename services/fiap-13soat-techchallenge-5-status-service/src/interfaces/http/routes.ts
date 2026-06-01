import { registry } from "@fiap-13soat/shared";
import type { FastifyInstance } from "fastify";
import jwt from "jsonwebtoken";
import {
  getDownloadBuffer,
  getHistory,
  getVideoStatus,
} from "../../application/queries/status-queries.js";

const jwtSecret = process.env.JWT_SECRET ?? "changeme-secret";

const userIdFromAuth = (auth?: string): string => {
  if (!auth) {
    throw new Error("missing auth");
  }
  const token = auth.replace("Bearer ", "");
  const decoded = jwt.verify(token, jwtSecret) as { sub: string };
  return decoded.sub;
};

export const registerStatusRoutes = (app: FastifyInstance): void => {
  app.get("/health/live", async () => ({
    status: "ok",
    service: "status-service",
  }));
  app.get("/health/ready", async () => ({ status: "ready" }));
  app.get("/metrics", async (_, reply) => {
    reply.header("Content-Type", registry.contentType);
    return registry.metrics();
  });

  app.get("/status/videos/:videoId", async (request, reply) => {
    const status = await getVideoStatus(
      (request.params as { videoId: string }).videoId,
    );
    if (!status) {
      return reply.code(404).send({ message: "video not found" });
    }
    reply.send(status);
  });

  app.get("/status/history", async (request, reply) => {
    try {
      const userId = userIdFromAuth(request.headers.authorization);
      const history = await getHistory(userId);
      reply.send({ items: history });
    } catch {
      reply.code(401).send({ message: "unauthorized" });
    }
  });

  app.get("/status/videos/:videoId/download", async (request, reply) => {
    const videoId = (request.params as { videoId: string }).videoId;
    const buffer = await getDownloadBuffer(videoId);

    if (!buffer) {
      return reply.code(404).send({ message: "zip not available" });
    }

    reply.header("Content-Type", "application/zip");
    reply.header("Content-Disposition", `attachment; filename=${videoId}.zip`);
    reply.send(buffer);
  });
};
