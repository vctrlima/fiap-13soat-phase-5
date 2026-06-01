import { describe, expect, it, vi } from "vitest";

const queryMock = vi.hoisted(() => vi.fn());

vi.mock("pg", () => ({
  Pool: vi.fn().mockImplementation(() => ({ query: queryMock })),
}));

describe("identity postgres", () => {
  it("creates users and refresh_tokens tables", async () => {
    queryMock.mockResolvedValue({ rowCount: 0, rows: [] });

    const { initIdentitySchema } = await import("./postgres.js");
    await initIdentitySchema();

    expect(queryMock).toHaveBeenCalledTimes(2);
    expect(String(queryMock.mock.calls[0][0])).toContain(
      "CREATE TABLE IF NOT EXISTS users",
    );
    expect(String(queryMock.mock.calls[1][0])).toContain(
      "CREATE TABLE IF NOT EXISTS refresh_tokens",
    );
  });
});
