import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { proxyRequest } from "./proxy.js";

type ReplyStub = {
  statusCode: number;
  body: unknown;
  headers: Record<string, string>;
  contentType?: string;
  code: (status: number) => ReplyStub;
  send: (payload?: unknown) => ReplyStub;
  header: (key: string, value: string) => ReplyStub;
  type: (value: string) => ReplyStub;
};

const makeReply = (): ReplyStub => {
  const reply: ReplyStub = {
    statusCode: 200,
    body: undefined,
    headers: {},
    contentType: undefined,
    code(status) {
      this.statusCode = status;
      return this;
    },
    send(payload) {
      this.body = payload;
      return this;
    },
    header(key, value) {
      this.headers[key] = value;
      return this;
    },
    type(value) {
      this.contentType = value;
      return this;
    },
  };

  return reply;
};

describe("proxyRequest", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("forwards JSON payload and relays JSON response", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 201,
        headers: {
          "content-type": "application/json",
          "x-upstream": "yes",
          "transfer-encoding": "chunked",
        },
      }),
    );

    const reply = makeReply();
    const request = {
      method: "POST",
      headers: {
        "content-type": "application/json",
        host: "gateway",
      },
      body: { value: 1 },
      raw: {},
    };

    await proxyRequest(
      request as never,
      reply as never,
      "http://video-service:3002",
      "/videos/upload",
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ value: 1 }));

    expect(reply.statusCode).toBe(201);
    expect(reply.headers["x-upstream"]).toBe("yes");
    expect(reply.headers["transfer-encoding"]).toBeUndefined();
    expect(reply.body).toEqual({ ok: true });
  });

  it("returns null when upstream has empty body", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      new Response("", {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const reply = makeReply();
    const request = {
      method: "GET",
      headers: {},
      body: undefined,
      raw: {},
    };

    await proxyRequest(
      request as never,
      reply as never,
      "http://identity",
      "/auth",
    );

    expect(reply.statusCode).toBe(200);
    expect(reply.body).toBeNull();
  });

  it("returns 503 with timeout message on abort", async () => {
    const fetchMock = vi.mocked(fetch);
    const abortError = new Error("aborted");
    abortError.name = "AbortError";
    fetchMock.mockRejectedValue(abortError);

    const reply = makeReply();
    const request = {
      method: "GET",
      headers: {},
      body: undefined,
      raw: {},
    };

    await proxyRequest(
      request as never,
      reply as never,
      "http://status",
      "/status",
    );

    expect(reply.statusCode).toBe(503);
    expect(reply.body).toEqual({
      message: "upstream timeout",
      details: "aborted",
    });
  });
});
