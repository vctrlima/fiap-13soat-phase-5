import { beforeEach, describe, expect, it, vi } from "vitest";

const randomUuidMock = vi.hoisted(() => vi.fn());
const s3SendMock = vi.hoisted(() => vi.fn());
const snsSendMock = vi.hoisted(() => vi.fn());
const sqsSendMock = vi.hoisted(() => vi.fn());
const queryMock = vi.hoisted(() => vi.fn());
const createDomainEventMock = vi.hoisted(() => vi.fn());
const uploadsIncMock = vi.hoisted(() => vi.fn());

vi.mock("node:crypto", () => ({
  randomUUID: randomUuidMock,
}));

vi.mock("@fiap-13soat/shared", () => ({
  createDomainEvent: createDomainEventMock,
  metrics: { uploadsTotal: { inc: uploadsIncMock } },
  s3Client: { send: s3SendMock },
  snsClient: { send: snsSendMock },
  sqsClient: { send: sqsSendMock },
}));

vi.mock("../../infrastructure/database/postgres.js", () => ({
  pool: { query: queryMock },
}));

describe("uploadVideo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    randomUuidMock.mockReturnValue("video-1");
    createDomainEventMock.mockReturnValue({
      eventId: "evt-1",
      eventName: "VideoUploaded",
      correlationId: "corr-1",
    });
    s3SendMock.mockResolvedValue({});
    snsSendMock.mockResolvedValue({});
    sqsSendMock.mockResolvedValue({});
    queryMock.mockResolvedValue({ rowCount: 1, rows: [] });
  });

  it("stores video, publishes events and returns pending status", async () => {
    const { uploadVideo } = await import("./upload-video.js");
    const buffer = Buffer.from("abc");

    const result = await uploadVideo({
      userId: "u-1",
      filename: "video.mp4",
      contentType: "video/mp4",
      fileBody: buffer,
      correlationId: "corr-1",
    });

    expect(s3SendMock).toHaveBeenCalledTimes(1);
    expect(queryMock).toHaveBeenCalledWith(
      "INSERT INTO videos (id, user_id, filename, s3_key, status) VALUES ($1, $2, $3, $4, $5)",
      ["video-1", "u-1", "video.mp4", "video-1/video.mp4", "PENDING"],
    );
    expect(snsSendMock).toHaveBeenCalledTimes(1);
    expect(sqsSendMock).toHaveBeenCalledTimes(1);
    expect(uploadsIncMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ videoId: "video-1", status: "PENDING" });
  });
});
