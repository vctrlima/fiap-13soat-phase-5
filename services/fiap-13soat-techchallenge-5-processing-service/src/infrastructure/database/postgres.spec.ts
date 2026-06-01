import { describe, expect, it, vi } from "vitest";

const queryMock = vi.hoisted(() => vi.fn());

vi.mock("pg", () => ({
  Pool: vi.fn().mockImplementation(() => ({ query: queryMock })),
}));

describe("processing postgres", () => {
  it("creates video_status and processed_events tables", async () => {
    queryMock.mockResolvedValue({ rowCount: 0, rows: [] });

    const { initProcessingSchema } = await import("./postgres.js");
    await initProcessingSchema();

    expect(queryMock).toHaveBeenCalledTimes(2);
    expect(String(queryMock.mock.calls[0][0])).toContain(
      "CREATE TABLE IF NOT EXISTS video_status",
    );
    expect(String(queryMock.mock.calls[1][0])).toContain(
      "CREATE TABLE IF NOT EXISTS processed_events",
    );
  });

  it("ignores duplicate error code on video_status creation", async () => {
    queryMock
      .mockRejectedValueOnce({ code: "23505" })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const { initProcessingSchema } = await import("./postgres.js");
    await expect(initProcessingSchema()).resolves.toBeUndefined();
  });
});
