import { describe, expect, it, vi } from "vitest";

const redisCtorMock = vi.hoisted(() => vi.fn());

vi.mock("ioredis", () => ({
  Redis: redisCtorMock,
}));

describe("status redis", () => {
  it("creates redis client with configured url", async () => {
    process.env.REDIS_URL = "redis://test:6379";
    await import("./redis.js");

    expect(redisCtorMock).toHaveBeenCalledWith("redis://test:6379");
  });
});
