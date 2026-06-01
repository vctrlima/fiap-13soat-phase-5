import { describe, expect, it, vi } from "vitest";

const collectDefaultMetricsMock = vi.hoisted(() => vi.fn());
const counterMock = vi.hoisted(() => vi.fn().mockImplementation((cfg) => cfg));
const histogramMock = vi.hoisted(() =>
  vi.fn().mockImplementation((cfg) => cfg),
);
const gaugeMock = vi.hoisted(() => vi.fn().mockImplementation((cfg) => cfg));
const registerMock = vi.hoisted(() => ({ contentType: "text/plain" }));

vi.mock("prom-client", () => ({
  default: {
    collectDefaultMetrics: collectDefaultMetricsMock,
    Counter: counterMock,
    Histogram: histogramMock,
    Gauge: gaugeMock,
    register: registerMock,
  },
}));

describe("metrics", () => {
  it("initializes collectors and exports registry", async () => {
    const { metrics, registry } = await import("./metrics.ts");

    expect(collectDefaultMetricsMock).toHaveBeenCalledTimes(1);
    expect(counterMock).toHaveBeenCalledTimes(4);
    expect(histogramMock).toHaveBeenCalledTimes(1);
    expect(gaugeMock).toHaveBeenCalledTimes(2);
    expect(metrics.uploadsTotal).toBeTruthy();
    expect(registry).toBe(registerMock);
  });
});
