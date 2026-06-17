import type { FastifyReply, FastifyRequest } from "fastify";
import { Readable } from "node:stream";
import type { ReadableStream as WebReadableStream } from "node:stream/web";

const upstreamTimeoutMs = Number(
  process.env.GATEWAY_UPSTREAM_TIMEOUT_MS ?? 15000,
);
const uploadUpstreamTimeoutMs = Number(
  process.env.GATEWAY_UPLOAD_TIMEOUT_MS ?? 120000,
);
const upstreamRetries = Number(process.env.GATEWAY_UPSTREAM_RETRIES ?? 1);

const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

const isRetriableStatus = (status: number): boolean =>
  status === 429 || status === 502 || status === 503 || status === 504;

const isIdempotentMethod = (method: string): boolean =>
  method === "GET" || method === "HEAD" || method === "OPTIONS";

const isTextResponse = (contentType: string): boolean => {
  const value = contentType.toLowerCase();
  return (
    value.startsWith("application/json") ||
    value.includes("+json") ||
    value.startsWith("text/")
  );
};

const resolveTimeoutMs = (
  request: FastifyRequest,
  targetPath: string,
): number => {
  const pathWithoutQuery = targetPath.split("?")[0];
  if (request.method === "POST" && pathWithoutQuery === "/videos/upload") {
    return uploadUpstreamTimeoutMs;
  }

  return upstreamTimeoutMs;
};

const fetchUpstream = async (
  url: string,
  request: FastifyRequest,
  headers: HeadersInit,
  body: BodyInit | undefined,
  timeoutMs: number,
): Promise<Response> => {
  let attempt = 0;

  while (true) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: request.method,
        headers,
        body,
        signal: controller.signal,
        duplex: "half",
      } as RequestInit & { duplex: "half" });

      if (
        isRetriableStatus(response.status) &&
        isIdempotentMethod(request.method) &&
        attempt < upstreamRetries
      ) {
        attempt += 1;
        await sleep(100 * 2 ** attempt);
        continue;
      }

      return response;
    } catch (error) {
      if (attempt >= upstreamRetries || !isIdempotentMethod(request.method)) {
        throw error;
      }
      attempt += 1;
      await sleep(100 * 2 ** attempt);
    } finally {
      clearTimeout(timeout);
    }
  }
};

export const proxyRequest = async (
  request: FastifyRequest,
  reply: FastifyReply,
  targetBaseUrl: string,
  targetPath: string,
): Promise<void> => {
  const url = `${targetBaseUrl}${targetPath}`;
  const timeoutMs = resolveTimeoutMs(request, targetPath);

  let body: BodyInit | undefined;
  if (!["GET", "HEAD"].includes(request.method)) {
    const contentType = request.headers["content-type"] ?? "";
    if (
      typeof contentType === "string" &&
      contentType.includes("multipart/form-data")
    ) {
      body = request.raw as unknown as BodyInit;
    } else if (request.body && typeof request.body === "object") {
      body = JSON.stringify(request.body);
    } else {
      body = request.body as string | undefined;
    }
  }

  const headers = new Headers();
  for (const [key, value] of Object.entries(request.headers)) {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey === "host" ||
      lowerKey === "connection" ||
      lowerKey === "transfer-encoding" ||
      lowerKey === "content-length"
    ) {
      continue;
    }

    if (typeof value === "string") {
      headers.set(key, value);
      continue;
    }

    if (Array.isArray(value)) {
      headers.set(key, value.join(","));
    }
  }

  let response: Response;
  try {
    response = await fetchUpstream(url, request, headers, body, timeoutMs);
  } catch (error) {
    const message =
      (error as Error).name === "AbortError"
        ? "upstream timeout"
        : "upstream unavailable";
    reply.code(503).send({ message, details: (error as Error).message });
    return;
  }

  reply.code(response.status);

  for (const [key, value] of response.headers.entries()) {
    if (key.toLowerCase() === "transfer-encoding") {
      continue;
    }
    reply.header(key, value);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!isTextResponse(contentType)) {
    if (response.body) {
      reply.send(
        Readable.fromWeb(response.body as unknown as WebReadableStream),
      );
      return;
    }

    const arrayBuffer = await response.arrayBuffer();
    reply.send(Buffer.from(arrayBuffer));
    return;
  }

  const text = await response.text();

  if (!text) {
    reply.send(null);
    return;
  }

  try {
    reply.send(JSON.parse(text));
  } catch {
    reply.type(response.headers.get("content-type") ?? "text/plain");
    reply.send(text);
  }
};
