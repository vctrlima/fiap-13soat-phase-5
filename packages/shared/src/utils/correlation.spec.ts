import { describe, expect, it, vi } from "vitest";

const uuidMock = vi.hoisted(() => vi.fn());

vi.mock("uuid", () => ({ v4: uuidMock }));

describe("correlationFromHeaders", () => {
  it("returns header correlation id when present", async () => {
    const { correlationFromHeaders } = await import("./correlation.ts");

    const result = correlationFromHeaders({ "x-correlation-id": "corr-1" });

    expect(result).toBe("corr-1");
  });

  it("generates correlation id when header is missing", async () => {
    uuidMock.mockReturnValueOnce("generated-corr");
    const { correlationFromHeaders } = await import("./correlation.ts");

    const result = correlationFromHeaders({});

    expect(result).toBe("generated-corr");
  });
});
