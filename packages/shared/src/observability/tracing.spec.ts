import { afterEach, describe, expect, it, vi } from "vitest";

const startMock = vi.hoisted(() => vi.fn());
const shutdownMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const nodeSdkCtorMock = vi.hoisted(() =>
  vi.fn().mockImplementation(() => ({
    start: startMock,
    shutdown: shutdownMock,
  })),
);
const exporterCtorMock = vi.hoisted(() => vi.fn());

vi.mock("@opentelemetry/sdk-node", () => ({ NodeSDK: nodeSdkCtorMock }));
vi.mock("@opentelemetry/exporter-trace-otlp-http", () => ({
  OTLPTraceExporter: exporterCtorMock,
}));

describe("tracing", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("initializes sdk once and supports stop", async () => {
    const { initTracing, stopTracing } = await import("./tracing.ts");

    await initTracing("service-a");
    await initTracing("service-a");

    expect(exporterCtorMock).toHaveBeenCalledWith({
      url: "http://localhost:4318/v1/traces",
    });
    expect(nodeSdkCtorMock).toHaveBeenCalledTimes(1);
    expect(startMock).toHaveBeenCalledTimes(1);

    await stopTracing();
    expect(shutdownMock).toHaveBeenCalledTimes(1);

    await stopTracing();
    expect(shutdownMock).toHaveBeenCalledTimes(1);
  });

  it("uses configured otel endpoint", async () => {
    vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://otel:4318");

    const { initTracing, stopTracing } = await import("./tracing.ts");
    await initTracing("service-b");

    expect(exporterCtorMock).toHaveBeenCalledWith({
      url: "http://otel:4318/v1/traces",
    });

    await stopTracing();
  });
});
