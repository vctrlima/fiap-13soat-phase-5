import { beforeEach, describe, expect, it, vi } from "vitest";

const appMock = vi.hoisted(() => ({
  register: vi.fn().mockResolvedValue(undefined),
  get: vi.fn(),
  listen: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
  log: { error: vi.fn() },
}));
const initTracingMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const stopTracingMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const runConsumerMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const stopConsumerMock = vi.hoisted(() => vi.fn());

vi.mock("fastify", () => ({ default: vi.fn(() => appMock) }));
vi.mock("@fiap-13soat/shared", () => ({
  initTracing: initTracingMock,
  registry: { contentType: "text/plain", metrics: () => "metrics" },
  stopTracing: stopTracingMock,
}));
vi.mock("./interfaces/consumers/sqs-consumer.js", () => ({
  runConsumer: runConsumerMock,
  stopConsumer: stopConsumerMock,
}));

describe("notification index", () => {
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

    expect(initTracingMock).toHaveBeenCalledWith("notification-service");
    expect(appMock.listen).toHaveBeenCalledWith({
      host: "0.0.0.0",
      port: 3005,
    });
    expect(runConsumerMock).toHaveBeenCalledTimes(1);

    await handlers.SIGINT?.();
    expect(stopConsumerMock).toHaveBeenCalledTimes(1);
    expect(appMock.close).toHaveBeenCalledTimes(1);
    expect(stopTracingMock).toHaveBeenCalledTimes(1);
    expect(exitSpy).toHaveBeenCalledWith(0);

    onSpy.mockRestore();
    exitSpy.mockRestore();
  });
});
