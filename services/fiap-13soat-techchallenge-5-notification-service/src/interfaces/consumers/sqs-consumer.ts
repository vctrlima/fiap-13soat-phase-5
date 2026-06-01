import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
  type Message,
} from "@aws-sdk/client-sqs";
import { sqsClient } from "@fiap-13soat/shared";
import { sendNotification } from "../../application/use-cases/send-notification.js";

let running = true;

const workerConcurrency = Math.max(
  1,
  Number(process.env.NOTIFICATION_WORKER_CONCURRENCY ?? 5),
);
const maxMessagesPerPoll = Math.max(
  1,
  Math.min(
    10,
    Number(process.env.NOTIFICATION_MAX_MESSAGES_PER_POLL ?? workerConcurrency),
  ),
);

const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

const processInParallel = async (
  items: Message[],
  concurrency: number,
  handler: (item: Message) => Promise<void>,
): Promise<void> => {
  const inFlight = new Set<Promise<void>>();

  for (const item of items) {
    let task: Promise<void>;
    task = handler(item).finally(() => {
      inFlight.delete(task);
    });
    inFlight.add(task);

    if (inFlight.size >= concurrency) {
      await Promise.race(inFlight);
    }
  }

  await Promise.allSettled(inFlight);
};

export const stopConsumer = (): void => {
  running = false;
};

export const runConsumer = async (): Promise<void> => {
  const queueUrl = process.env.VIDEO_NOTIFICATION_QUEUE_URL;
  if (!queueUrl) {
    throw new Error("VIDEO_NOTIFICATION_QUEUE_URL is required");
  }

  let pollFailureCount = 0;

  while (running) {
    try {
      const response = await sqsClient.send(
        new ReceiveMessageCommand({
          QueueUrl: queueUrl,
          WaitTimeSeconds: 20,
          MaxNumberOfMessages: maxMessagesPerPoll,
        }),
      );

      if (!response.Messages?.length) {
        pollFailureCount = 0;
        continue;
      }

      await processInParallel(
        response.Messages,
        workerConcurrency,
        async (message) => {
          if (!message.Body || !message.ReceiptHandle) {
            return;
          }

          try {
            const event = JSON.parse(message.Body) as {
              eventName?: string;
              payload?: {
                subject?: string;
                message?: string;
                userId?: string;
                error?: string;
                videoId?: string;
              };
            };

            const eventName = event.eventName ?? "NotificationRequested";
            const subject =
              event.payload?.subject ??
              (eventName === "VideoProcessingFailed"
                ? "Video processing failed"
                : "Video processing update");

            const body =
              event.payload?.message ??
              (eventName === "VideoProcessingFailed"
                ? `Falha no processamento do video ${event.payload?.videoId ?? "unknown"}: ${event.payload?.error ?? "unknown"}`
                : `Processamento concluido para o video ${event.payload?.videoId ?? "unknown"}`);

            await sendNotification({ subject, body });

            await sqsClient.send(
              new DeleteMessageCommand({
                QueueUrl: queueUrl,
                ReceiptHandle: message.ReceiptHandle,
              }),
            );
          } catch (error) {
            console.error("notification send failed", error);
          }
        },
      );

      pollFailureCount = 0;
    } catch (error) {
      pollFailureCount += 1;
      const waitMs = Math.min(10000, 250 * 2 ** pollFailureCount);
      console.error("notification consumer poll failed", error);
      await sleep(waitMs);
    }
  }
};
