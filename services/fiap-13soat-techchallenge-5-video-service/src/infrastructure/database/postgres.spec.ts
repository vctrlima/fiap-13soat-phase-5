import { describe, expect, it, vi } from "vitest";

const queryMock = vi.hoisted(() => vi.fn());

vi.mock("pg", () => ({
  Pool: vi.fn().mockImplementation(() => ({ query: queryMock })),
}));

describe("video postgres", () => {
  it("creates videos table", async () => {
    queryMock.mockResolvedValue({ rowCount: 0, rows: [] });

    const { initVideoSchema } = await import("./postgres.js");
    await initVideoSchema();

    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(String(queryMock.mock.calls[0][0])).toContain(
      "CREATE TABLE IF NOT EXISTS videos",
    );
  });
});
