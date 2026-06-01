import { beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.hoisted(() => vi.fn());
const processVideoEventMock = vi.hoisted(() => vi.fn());
const activeWorkersSetMock = vi.hoisted(() => vi.fn());
const queueSizeSetMock = vi.hoisted(() => vi.fn());

vi.mock("@fiap-13soat/shared", () => ({
  sqsClient: { send: sendMock },
  metrics: {
    activeWorkers: { set: activeWorkersSetMock },
    queueSize: { set: queueSizeSetMock },
  },
}));

vi.mock("../../application/use-cases/process-video.js", () => ({
  processVideoEvent: processVideoEventMock,
}));

describe("processing sqs consumer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.VIDEO_PROCESSING_QUEUE_URL = "https://queue";
  });

  it("fails fast when queue url is missing", async () => {
    delete process.env.VIDEO_PROCESSING_QUEUE_URL;
    const { runConsumer } = await import("./sqs-consumer.js");

    await expect(runConsumer()).rejects.toThrow(
      "VIDEO_PROCESSING_QUEUE_URL is required",
    );
  });

  it("processes and deletes received message", async () => {
    const { runConsumer, stopConsumer } = await import("./sqs-consumer.js");
    sendMock.mockImplementation(
      async (command: { constructor?: { name?: string } }) => {
        const commandName = command.constructor?.name;

        if (commandName === "GetQueueAttributesCommand") {
          return { Attributes: { ApproximateNumberOfMessages: "1" } };
        }
        if (commandName === "ReceiveMessageCommand") {
          return {
            Messages: [
              {
                Body: JSON.stringify({
                  eventId: "evt-1",
                  correlationId: "corr-1",
                  payload: {
                    videoId: "v-1",
                    userId: "u-1",
                    s3Key: "v-1/video.mp4",
                    filename: "video.mp4",
                  },
                }),
                ReceiptHandle: "rh-1",
              },
            ],
          };
        }

        stopConsumer();
        return {};
      },
    );

    await runConsumer();

    expect(processVideoEventMock).toHaveBeenCalledTimes(1);
    expect(sendMock).toHaveBeenCalled();
    expect(activeWorkersSetMock).toHaveBeenCalledWith(0);
  });
});
