import { beforeEach, describe, expect, it, vi } from "vitest";

const uploadVideoMock = vi.hoisted(() => vi.fn());
const correlationMock = vi.hoisted(() => vi.fn());

vi.mock("../../application/use-cases/upload-video.js", () => ({
  uploadVideo: uploadVideoMock,
}));

vi.mock("@fiap-13soat/shared", () => ({
  correlationFromHeaders: correlationMock,
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

describe("registerVideoRoutes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    correlationMock.mockReturnValue("corr-1");
  });

  it("returns 400 when no file is provided", async () => {
    const postHandlers: Record<string, Handler> = {};
    const app = {
      get: vi.fn(),
      post: vi.fn((path: string, handler: Handler) => {
        postHandlers[path] = handler;
      }),
    };

    const { registerVideoRoutes } = await import("./routes.js");
    registerVideoRoutes(app as never);

    const reply = makeReply();
    await postHandlers["/videos/upload"]({ file: async () => null, headers: {} }, reply);

    expect(reply.statusCode).toBe(400);
    expect(reply.payload).toEqual({ message: "video file is required" });
  });

  it("uploads file and responds 202", async () => {
    const postHandlers: Record<string, Handler> = {};
    const getHandlers: Record<string, Handler> = {};
    const app = {
      get: vi.fn((path: string, handler: Handler) => {
        getHandlers[path] = handler;
      }),
      post: vi.fn((path: string, handler: Handler) => {
        postHandlers[path] = handler;
      }),
    };

    const { registerVideoRoutes } = await import("./routes.js");
    registerVideoRoutes(app as never);

    uploadVideoMock.mockResolvedValueOnce({ videoId: "v-1", status: "PENDING" });

    const reply = makeReply();
    await postHandlers["/videos/upload"](
      {
        file: async () => ({
          filename: "video.mp4",
          mimetype: "video/mp4",
          file: Buffer.from("abc"),
        }),
        headers: { "x-user-id": "u-1" },
      },
      reply,
    );

    expect(uploadVideoMock).toHaveBeenCalledWith({
      userId: "u-1",
      filename: "video.mp4",
      contentType: "video/mp4",
      fileBody: Buffer.from("abc"),
      correlationId: "corr-1",
    });
    expect(reply.statusCode).toBe(202);
    expect(reply.payload).toEqual({ videoId: "v-1", status: "PENDING" });

    const metricsReply = makeReply();
    const metrics = await getHandlers["/metrics"]({}, metricsReply);
    expect(metricsReply.headers["Content-Type"]).toBe("text/plain");
    expect(metrics).toBe("m");
  });
});
