import { Readable } from "node:stream";
import { beforeEach, describe, expect, it, vi } from "vitest";

const redisGetMock = vi.hoisted(() => vi.fn());
const redisSetMock = vi.hoisted(() => vi.fn());
const queryMock = vi.hoisted(() => vi.fn());
const s3SendMock = vi.hoisted(() => vi.fn());

vi.mock("../../infrastructure/cache/redis.js", () => ({
  redis: {
    get: redisGetMock,
    set: redisSetMock,
  },
}));

vi.mock("../../infrastructure/database/postgres.js", () => ({
  pool: { query: queryMock },
}));

vi.mock("@fiap-13soat/shared", () => ({
  s3Client: { send: s3SendMock },
}));

describe("status queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns cached status without querying database", async () => {
    redisGetMock.mockResolvedValueOnce(JSON.stringify({ video_id: "v-1" }));

    const { getVideoStatus } = await import("./status-queries.js");
    const status = await getVideoStatus("v-1");

    expect(status).toEqual({ video_id: "v-1" });
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("returns null when status is not found", async () => {
    redisGetMock.mockResolvedValueOnce(null);
    queryMock.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const { getVideoStatus } = await import("./status-queries.js");
    const status = await getVideoStatus("v-404");

    expect(status).toBeNull();
  });

  it("queries history ordered by update time", async () => {
    queryMock.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ video_id: "v-1" }],
    });

    const { getHistory } = await import("./status-queries.js");
    const items = await getHistory("u-1");

    expect(items).toEqual([{ video_id: "v-1" }]);
    expect(queryMock).toHaveBeenCalledWith(
      "SELECT * FROM video_status WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 100",
      ["u-1"],
    );
  });

  it("returns zip buffer when downloadable status exists", async () => {
    redisGetMock.mockResolvedValueOnce(
      JSON.stringify({ video_id: "v-1", zip_key: "v-1/v-1.zip" }),
    );
    s3SendMock.mockResolvedValueOnce({
      Body: Readable.from([Buffer.from("zip")]),
    });

    const { getDownloadBuffer } = await import("./status-queries.js");
    const result = await getDownloadBuffer("v-1");

    expect(result).toEqual(Buffer.from("zip"));
  });

  it("returns null when zip is not available", async () => {
    redisGetMock.mockResolvedValueOnce(
      JSON.stringify({ video_id: "v-1", zip_key: null }),
    );

    const { getDownloadBuffer } = await import("./status-queries.js");
    const result = await getDownloadBuffer("v-1");

    expect(result).toBeNull();
    expect(s3SendMock).not.toHaveBeenCalled();
  });
});
