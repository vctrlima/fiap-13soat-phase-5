import { describe, expect, it } from "vitest";
import * as shared from "./index.ts";

describe("shared index exports", () => {
  it("re-exports expected modules", () => {
    expect(typeof shared.createDomainEvent).toBe("function");
    expect(typeof shared.loadAppSecrets).toBe("function");
    expect(typeof shared.initTracing).toBe("function");
    expect(typeof shared.stopTracing).toBe("function");
    expect(typeof shared.correlationFromHeaders).toBe("function");
    expect(shared.registry).toBeDefined();
    expect(shared.metrics).toBeDefined();
    expect(shared.s3Client).toBeDefined();
  });
});
