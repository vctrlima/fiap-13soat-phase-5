import { afterEach, describe, expect, it, vi } from "vitest";

describe("service-map", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("uses default endpoints when env vars are missing", async () => {
    delete process.env.IDENTITY_SERVICE_URL;
    delete process.env.VIDEO_SERVICE_URL;
    delete process.env.STATUS_SERVICE_URL;

    const { serviceMap } = await import("./service-map.js");

    expect(serviceMap.identity).toBe("http://identity-service:3001");
    expect(serviceMap.video).toBe("http://video-service:3002");
    expect(serviceMap.status).toBe("http://status-service:3004");
  });

  it("uses configured env endpoints", async () => {
    vi.stubEnv("IDENTITY_SERVICE_URL", "http://identity:9001");
    vi.stubEnv("VIDEO_SERVICE_URL", "http://video:9002");
    vi.stubEnv("STATUS_SERVICE_URL", "http://status:9004");

    const { serviceMap } = await import("./service-map.js");

    expect(serviceMap.identity).toBe("http://identity:9001");
    expect(serviceMap.video).toBe("http://video:9002");
    expect(serviceMap.status).toBe("http://status:9004");
  });
});
