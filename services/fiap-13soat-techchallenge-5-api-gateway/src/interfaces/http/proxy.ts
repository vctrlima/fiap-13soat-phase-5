import type { FastifyReply, FastifyRequest } from "fastify";

const upstreamTimeoutMs = Number(
  process.env.GATEWAY_UPSTREAM_TIMEOUT_MS ?? 15000,
);
const upstreamRetries = Number(process.env.GATEWAY_UPSTREAM_RETRIES ?? 1);

const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

const isRetriableStatus = (status: number): boolean =>
  status === 429 || status === 502 || status === 503 || status === 504;

const isIdempotentMethod = (method: string): boolean =>
  method === "GET" || method === "HEAD" || method === "OPTIONS";

const fetchUpstream = async (
  url: string,
  request: FastifyRequest,
  headers: HeadersInit,
  body: BodyInit | undefined,
): Promise<Response> => {
  let attempt = 0;

  while (true) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), upstreamTimeoutMs);

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

  const headers = {
    ...(request.headers as Record<string, string>),
    host: undefined,
  } as Record<string, string | undefined>;

  let response: Response;
  try {
    response = await fetchUpstream(url, request, headers as HeadersInit, body);
  } catch (error) {
    const message =
      (error as Error).name === "AbortError"
        ? "upstream timeout"
        : "upstream unavailable";
    reply.code(503).send({ message, details: (error as Error).message });
    return;
  }

  const text = await response.text();
  reply.code(response.status);

  for (const [key, value] of response.headers.entries()) {
    if (key.toLowerCase() === "transfer-encoding") {
      continue;
    }
    reply.header(key, value);
  }

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
