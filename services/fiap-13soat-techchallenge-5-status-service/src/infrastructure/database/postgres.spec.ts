import { describe, expect, it, vi } from "vitest";

const queryMock = vi.hoisted(() => vi.fn());

vi.mock("pg", () => ({
  Pool: vi.fn().mockImplementation(() => ({ query: queryMock })),
}));

describe("status postgres", () => {
  it("creates video_status table", async () => {
    queryMock.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const { initStatusSchema } = await import("./postgres.js");
    await initStatusSchema();

    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(String(queryMock.mock.calls[0][0])).toContain(
      "CREATE TABLE IF NOT EXISTS video_status",
    );
  });

  it("ignores duplicate key creation race", async () => {
    queryMock.mockRejectedValueOnce({ code: "23505" });

    const { initStatusSchema } = await import("./postgres.js");
    await expect(initStatusSchema()).resolves.toBeUndefined();
  });
});
