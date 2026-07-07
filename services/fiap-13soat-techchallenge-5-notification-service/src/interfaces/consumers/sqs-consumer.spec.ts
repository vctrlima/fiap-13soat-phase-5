import { beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.hoisted(() => vi.fn());
const sendNotificationMock = vi.hoisted(() => vi.fn());
const activeWorkersSetMock = vi.hoisted(() => vi.fn());
const queueSizeSetMock = vi.hoisted(() => vi.fn());
const queueOldestMessageAgeSecondsSetMock = vi.hoisted(() => vi.fn());

vi.mock("@fiap-13soat/shared", () => ({
  sqsClient: { send: sendMock },
  metrics: {
    activeWorkers: { set: activeWorkersSetMock },
    queueSize: { set: queueSizeSetMock },
    queueOldestMessageAgeSeconds: { set: queueOldestMessageAgeSecondsSetMock },
  },
}));

vi.mock("../../application/use-cases/send-notification.js", () => ({
  sendNotification: sendNotificationMock,
}));

describe("notification sqs consumer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.VIDEO_NOTIFICATION_QUEUE_URL = "https://queue";
    sendNotificationMock.mockResolvedValue(undefined);
  });

  it("fails fast when queue url is missing", async () => {
    delete process.env.VIDEO_NOTIFICATION_QUEUE_URL;
    const { runConsumer } = await import("./sqs-consumer.js");

    await expect(runConsumer()).rejects.toThrow(
      "VIDEO_NOTIFICATION_QUEUE_URL is required",
    );
  });

  it("consumes and sends notification for received event", async () => {
    const { runConsumer, stopConsumer } = await import("./sqs-consumer.js");
    sendMock.mockImplementation(
      async (command: { constructor?: { name?: string } }) => {
        const commandName = command.constructor?.name;

        if (commandName === "GetQueueAttributesCommand") {
          return {
            Attributes: {
              ApproximateNumberOfMessages: "1",
              ApproximateAgeOfOldestMessage: "7",
            },
          };
        }
        if (commandName === "ReceiveMessageCommand") {
          return {
            Messages: [
              {
                Body: JSON.stringify({
                  eventName: "VideoProcessingCompleted",
                  payload: { videoId: "v-1" },
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

    expect(sendNotificationMock).toHaveBeenCalledTimes(1);
    expect(sendMock).toHaveBeenCalled();
    expect(activeWorkersSetMock).toHaveBeenCalledWith(5);
    expect(queueOldestMessageAgeSecondsSetMock).toHaveBeenCalledWith(7);
  });
});
