import { correlationFromHeaders, registry } from "@fiap-13soat/shared";
import type { FastifyInstance } from "fastify";
import { uploadVideo } from "../../application/use-cases/upload-video.js";

const streamToBuffer = async (
  stream: NodeJS.ReadableStream,
): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

export const registerVideoRoutes = (app: FastifyInstance): void => {
  app.get("/health/live", async () => ({
    status: "ok",
    service: "video-service",
  }));
  app.get("/health/ready", async () => ({ status: "ready" }));
  app.get("/metrics", async (_, reply) => {
    reply.header("Content-Type", registry.contentType);
    return registry.metrics();
  });

  app.post("/videos/upload", async (request, reply) => {
    const part = await request.file();
    if (!part) {
      return reply.code(400).send({ message: "video file is required" });
    }

    const userIdHeader = request.headers["x-user-id"];
    const userId =
      typeof userIdHeader === "string" ? userIdHeader : "anonymous";
    const fileBuffer = await streamToBuffer(part.file);

    const result = await uploadVideo({
      userId,
      filename: part.filename,
      contentType: part.mimetype,
      fileBody: fileBuffer,
      contentLength: fileBuffer.length,
      correlationId: correlationFromHeaders(request.headers),
    });

    reply.code(202).send(result);
  });
};
