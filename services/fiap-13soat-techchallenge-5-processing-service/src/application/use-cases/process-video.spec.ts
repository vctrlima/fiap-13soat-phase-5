import { Readable } from "node:stream";
import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.hoisted(() => vi.fn());
const s3SendMock = vi.hoisted(() => vi.fn());
const sqsSendMock = vi.hoisted(() => vi.fn());
const createDomainEventMock = vi.hoisted(() => vi.fn());
const processingStartedIncMock = vi.hoisted(() => vi.fn());
const processingCompletedIncMock = vi.hoisted(() => vi.fn());
const processingFailedIncMock = vi.hoisted(() => vi.fn());
const processingDurationObserveMock = vi.hoisted(() => vi.fn());
const execFileMock = vi.hoisted(() => vi.fn());
const mkdirMock = vi.hoisted(() => vi.fn());
const readdirMock = vi.hoisted(() => vi.fn());
const readFileMock = vi.hoisted(() => vi.fn());
const rmMock = vi.hoisted(() => vi.fn());
const writeFileMock = vi.hoisted(() => vi.fn());

vi.mock("../../infrastructure/database/postgres.js", () => ({
  pool: { query: queryMock },
}));

vi.mock("@fiap-13soat/shared", () => ({
  createDomainEvent: createDomainEventMock,
  s3Client: { send: s3SendMock },
  sqsClient: { send: sqsSendMock },
  metrics: {
    processingStartedTotal: { inc: processingStartedIncMock },
    processingCompletedTotal: { inc: processingCompletedIncMock },
    processingFailedTotal: { inc: processingFailedIncMock },
    processingDurationSeconds: { observe: processingDurationObserveMock },
  },
}));

vi.mock("node:child_process", () => ({
  execFile: execFileMock,
}));

vi.mock("node:fs/promises", () => ({
  mkdir: mkdirMock,
  readdir: readdirMock,
  readFile: readFileMock,
  rm: rmMock,
  writeFile: writeFileMock,
}));

const event = {
  eventId: "evt-1",
  correlationId: "corr-1",
  payload: {
    videoId: "v-1",
    userId: "u-1",
    s3Key: "v-1/video.mp4",
    filename: "video.mp4",
  },
};

describe("processVideoEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mkdirMock.mockResolvedValue(undefined);
    readdirMock.mockResolvedValue(["frame_0001.png"]);
    readFileMock.mockResolvedValue(Buffer.from("zip"));
    rmMock.mockResolvedValue(undefined);
    writeFileMock.mockResolvedValue(undefined);
    s3SendMock.mockResolvedValue({
      Body: Readable.from([Buffer.from("video")]),
    });
    sqsSendMock.mockResolvedValue({});
    createDomainEventMock.mockImplementation(
      (eventName, payload, correlationId) => ({
        eventId: `${eventName}-id`,
        eventName,
        payload,
        correlationId,
      }),
    );
    execFileMock.mockImplementation((_, __, callback) =>
      callback(null, "", ""),
    );
  });

  it("returns early when event is already processed", async () => {
    queryMock.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ event_id: "evt-1" }],
    });
    const { processVideoEvent } = await import("./process-video.js");

    await processVideoEvent(event);

    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(s3SendMock).not.toHaveBeenCalled();
  });

  it("processes video and persists completed status", async () => {
    queryMock
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValue({ rowCount: 1, rows: [] });

    const { processVideoEvent } = await import("./process-video.js");
    await processVideoEvent(event);

    expect(processingStartedIncMock).toHaveBeenCalledTimes(1);
    expect(processingCompletedIncMock).toHaveBeenCalledTimes(1);
    expect(processingFailedIncMock).not.toHaveBeenCalled();
    expect(s3SendMock).toHaveBeenCalledTimes(2);
    expect(sqsSendMock).toHaveBeenCalledTimes(3);
    expect(queryMock).toHaveBeenCalledWith(
      "INSERT INTO processed_events (event_id) VALUES ($1) ON CONFLICT DO NOTHING",
      ["evt-1"],
    );
    expect(rmMock).toHaveBeenCalledTimes(1);
    expect(processingDurationObserveMock).toHaveBeenCalledTimes(1);
  });

  it("marks processing as failed and rethrows on error", async () => {
    queryMock
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValue({ rowCount: 1, rows: [] });
    execFileMock.mockImplementation((binary, _args, callback) => {
      if (binary === "ffmpeg") {
        callback(new Error("ffmpeg failed"), "", "");
        return;
      }
      callback(null, "", "");
    });

    const { processVideoEvent } = await import("./process-video.js");

    await expect(processVideoEvent(event)).rejects.toThrow("ffmpeg failed");
    expect(processingFailedIncMock).toHaveBeenCalledTimes(1);
    expect(queryMock).not.toHaveBeenCalledWith(
      "INSERT INTO processed_events (event_id) VALUES ($1) ON CONFLICT DO NOTHING",
      ["evt-1"],
    );
    expect(rmMock).toHaveBeenCalledTimes(1);
  });
});
