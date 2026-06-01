import { beforeEach, describe, expect, it, vi } from "vitest";

const getVideoStatusMock = vi.hoisted(() => vi.fn());
const getHistoryMock = vi.hoisted(() => vi.fn());
const getDownloadBufferMock = vi.hoisted(() => vi.fn());
const verifyMock = vi.hoisted(() => vi.fn());

vi.mock("../../application/queries/status-queries.js", () => ({
  getVideoStatus: getVideoStatusMock,
  getHistory: getHistoryMock,
  getDownloadBuffer: getDownloadBufferMock,
}));

vi.mock("jsonwebtoken", () => ({
  default: { verify: verifyMock },
}));

vi.mock("@fiap-13soat/shared", () => ({
  registry: { contentType: "text/plain", metrics: () => "m" },
}));

type Handler = (request: any, reply: any) => Promise<any>;

const makeReply = () => ({
  statusCode: 200,
  payload: undefined as unknown,
  headers: {} as Record<string, string>,
  code(status: number) {
    this.statusCode = status;
    return this;
  },
  send(payload?: unknown) {
    this.payload = payload;
    return this;
  },
  header(key: string, value: string) {
    this.headers[key] = value;
    return this;
  },
});

describe("registerStatusRoutes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns status by video id and 404 when missing", async () => {
    const getHandlers: Record<string, Handler> = {};
    const app = {
      get: vi.fn((path: string, handler: Handler) => {
        getHandlers[path] = handler;
      }),
    };

    const { registerStatusRoutes } = await import("./routes.js");
    registerStatusRoutes(app as never);

    getVideoStatusMock.mockResolvedValueOnce({ video_id: "v-1" });
    const okReply = makeReply();
    await getHandlers["/status/videos/:videoId"](
      { params: { videoId: "v-1" } },
      okReply,
    );
    expect(okReply.payload).toEqual({ video_id: "v-1" });

    getVideoStatusMock.mockResolvedValueOnce(null);
    const notFoundReply = makeReply();
    await getHandlers["/status/videos/:videoId"](
      { params: { videoId: "v-404" } },
      notFoundReply,
    );
    expect(notFoundReply.statusCode).toBe(404);
  });

  it("returns history for authorized user", async () => {
    const getHandlers: Record<string, Handler> = {};
    const app = {
      get: vi.fn((path: string, handler: Handler) => {
        getHandlers[path] = handler;
      }),
    };

    const { registerStatusRoutes } = await import("./routes.js");
    registerStatusRoutes(app as never);

    verifyMock.mockReturnValueOnce({ sub: "u-1" });
    getHistoryMock.mockResolvedValueOnce([{ video_id: "v-1" }]);

    const reply = makeReply();
    await getHandlers["/status/history"](
      { headers: { authorization: "Bearer token" } },
      reply,
    );

    expect(getHistoryMock).toHaveBeenCalledWith("u-1");
    expect(reply.payload).toEqual({ items: [{ video_id: "v-1" }] });
  });

  it("returns unauthorized when auth token is missing or invalid", async () => {
    const getHandlers: Record<string, Handler> = {};
    const app = {
      get: vi.fn((path: string, handler: Handler) => {
        getHandlers[path] = handler;
      }),
    };

    const { registerStatusRoutes } = await import("./routes.js");
    registerStatusRoutes(app as never);

    const reply = makeReply();
    await getHandlers["/status/history"]({ headers: {} }, reply);
    expect(reply.statusCode).toBe(401);
  });

  it("returns downloadable zip when available", async () => {
    const getHandlers: Record<string, Handler> = {};
    const app = {
      get: vi.fn((path: string, handler: Handler) => {
        getHandlers[path] = handler;
      }),
    };

    const { registerStatusRoutes } = await import("./routes.js");
    registerStatusRoutes(app as never);

    getDownloadBufferMock.mockResolvedValueOnce(Buffer.from("zip"));
    const okReply = makeReply();
    await getHandlers["/status/videos/:videoId/download"](
      { params: { videoId: "v-1" } },
      okReply,
    );
    expect(okReply.headers["Content-Type"]).toBe("application/zip");
    expect(okReply.payload).toEqual(Buffer.from("zip"));

    getDownloadBufferMock.mockResolvedValueOnce(null);
    const missingReply = makeReply();
    await getHandlers["/status/videos/:videoId/download"](
      { params: { videoId: "v-1" } },
      missingReply,
    );
    expect(missingReply.statusCode).toBe(404);
  });
});
