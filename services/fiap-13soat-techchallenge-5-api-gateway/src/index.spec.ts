import { beforeEach, describe, expect, it, vi } from "vitest";

const appMock = vi.hoisted(() => ({
  register: vi.fn().mockResolvedValue(undefined),
  get: vi.fn(),
  route: vi.fn(),
  listen: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
  log: { error: vi.fn() },
}));

const initTracingMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const stopTracingMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const correlationFromHeadersMock = vi.hoisted(() =>
  vi.fn().mockReturnValue("corr-1"),
);
const requiresAuthMock = vi.hoisted(() => vi.fn());
const resolveRouteTargetMock = vi.hoisted(() => vi.fn());
const proxyRequestMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const verifyMock = vi.hoisted(() => vi.fn());

vi.mock("fastify", () => ({
  default: vi.fn(() => appMock),
}));

vi.mock("@fiap-13soat/shared", () => ({
  correlationFromHeaders: correlationFromHeadersMock,
  initTracing: initTracingMock,
  registry: { contentType: "text/plain", metrics: () => "metrics" },
  stopTracing: stopTracingMock,
}));

vi.mock("./domain/services/routing-policy.js", () => ({
  requiresAuth: requiresAuthMock,
  resolveRouteTarget: resolveRouteTargetMock,
}));

vi.mock("./interfaces/http/proxy.js", () => ({
  proxyRequest: proxyRequestMock,
}));

vi.mock("./application/ports/service-map.js", () => ({
  serviceMap: {
    identity: "http://identity",
    video: "http://video",
    status: "http://status",
  },
}));

vi.mock("jsonwebtoken", () => ({
  default: { verify: verifyMock },
}));

describe("api-gateway index", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("bootstraps app, handles main route flow and shuts down", async () => {
    const handlers: Partial<Record<"SIGTERM" | "SIGINT", () => Promise<void>>> =
      {};
    const onSpy = vi.spyOn(process, "on").mockImplementation(((
      signal: string,
      handler: () => Promise<void>,
    ) => {
      if (signal === "SIGTERM" || signal === "SIGINT") {
        handlers[signal] = handler;
      }
      return process;
    }) as never);
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation((() => undefined) as never);

    await import("./index.js");

    expect(initTracingMock).toHaveBeenCalledWith("api-gateway");
    expect(appMock.listen).toHaveBeenCalledWith({
      host: "0.0.0.0",
      port: 3000,
    });

    const routeConfig = appMock.route.mock.calls[0]?.[0] as {
      handler: (request: any, reply: any) => Promise<void>;
    };
    expect(routeConfig).toBeTruthy();

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

    requiresAuthMock.mockReturnValue(false);
    resolveRouteTargetMock.mockReturnValue("video");
    const okReply = makeReply();
    const okRequest = { url: "/videos/upload?x=1", method: "GET", headers: {} };

    await routeConfig.handler(okRequest, okReply);
    expect(proxyRequestMock).toHaveBeenCalledWith(
      okRequest,
      okReply,
      "http://video",
      "/videos/upload?x=1",
    );

    requiresAuthMock.mockReturnValue(true);
    const noAuthReply = makeReply();
    await routeConfig.handler(
      { url: "/videos/upload", method: "GET", headers: {} },
      noAuthReply,
    );
    expect(noAuthReply.statusCode).toBe(401);

    requiresAuthMock.mockReturnValue(true);
    verifyMock.mockReturnValue({ sub: "u-1", role: "ADMIN" });
    resolveRouteTargetMock.mockImplementation(() => {
      throw new Error("route not found");
    });
    const notFoundReply = makeReply();
    await routeConfig.handler(
      {
        url: "/unknown",
        method: "GET",
        headers: { authorization: "Bearer token" },
      },
      notFoundReply,
    );
    expect(notFoundReply.statusCode).toBe(404);

    resolveRouteTargetMock.mockReturnValue("video");
    verifyMock.mockImplementation(() => {
      const err = new Error("expired");
      err.name = "TokenExpiredError";
      throw err;
    });
    const expiredReply = makeReply();
    await routeConfig.handler(
      {
        url: "/videos/upload",
        method: "GET",
        headers: { authorization: "Bearer token" },
      },
      expiredReply,
    );
    expect(expiredReply.statusCode).toBe(401);

    verifyMock.mockImplementation(() => {
      const err = new Error("bad");
      err.name = "JsonWebTokenError";
      throw err;
    });
    const invalidReply = makeReply();
    await routeConfig.handler(
      {
        url: "/videos/upload",
        method: "GET",
        headers: { authorization: "Bearer token" },
      },
      invalidReply,
    );
    expect(invalidReply.statusCode).toBe(401);

    requiresAuthMock.mockReturnValue(false);
    resolveRouteTargetMock.mockImplementation(() => {
      throw new Error("boom");
    });
    const errorReply = makeReply();
    await routeConfig.handler(
      { url: "/videos/upload", method: "GET", headers: {} },
      errorReply,
    );
    expect(errorReply.statusCode).toBe(500);

    await handlers.SIGTERM?.();
    expect(appMock.close).toHaveBeenCalledTimes(1);
    expect(stopTracingMock).toHaveBeenCalledTimes(1);
    expect(exitSpy).toHaveBeenCalledWith(0);

    onSpy.mockRestore();
    exitSpy.mockRestore();
  });
});
