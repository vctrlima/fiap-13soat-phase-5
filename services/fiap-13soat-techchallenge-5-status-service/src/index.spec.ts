import { beforeEach, describe, expect, it, vi } from "vitest";

const appMock = vi.hoisted(() => ({
  register: vi.fn().mockResolvedValue(undefined),
  listen: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
  log: { error: vi.fn() },
}));
const initTracingMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const stopTracingMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const initStatusSchemaMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue(undefined),
);
const poolEndMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const redisDisconnectMock = vi.hoisted(() => vi.fn());
const registerRoutesMock = vi.hoisted(() => vi.fn());

vi.mock("fastify", () => ({ default: vi.fn(() => appMock) }));
vi.mock("@fiap-13soat/shared", () => ({
  initTracing: initTracingMock,
  stopTracing: stopTracingMock,
}));
vi.mock("./infrastructure/database/postgres.js", () => ({
  initStatusSchema: initStatusSchemaMock,
  pool: { end: poolEndMock },
}));
vi.mock("./infrastructure/cache/redis.js", () => ({
  redis: { disconnect: redisDisconnectMock },
}));
vi.mock("./interfaces/http/routes.js", () => ({
  registerStatusRoutes: registerRoutesMock,
}));

describe("status index", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("bootstraps and executes shutdown flow", async () => {
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

    expect(initTracingMock).toHaveBeenCalledWith("status-service");
    expect(initStatusSchemaMock).toHaveBeenCalledTimes(1);
    expect(registerRoutesMock).toHaveBeenCalledWith(appMock);
    expect(appMock.listen).toHaveBeenCalledWith({
      host: "0.0.0.0",
      port: 3004,
    });

    await handlers.SIGINT?.();
    expect(appMock.close).toHaveBeenCalledTimes(1);
    expect(poolEndMock).toHaveBeenCalledTimes(1);
    expect(redisDisconnectMock).toHaveBeenCalledTimes(1);
    expect(stopTracingMock).toHaveBeenCalledTimes(1);
    expect(exitSpy).toHaveBeenCalledWith(0);

    onSpy.mockRestore();
    exitSpy.mockRestore();
  });
});
