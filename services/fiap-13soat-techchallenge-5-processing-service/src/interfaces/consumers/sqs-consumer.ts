import {
  DeleteMessageCommand,
  GetQueueAttributesCommand,
  ReceiveMessageCommand,
  type Message,
} from "@aws-sdk/client-sqs";
import { metrics, sqsClient } from "@fiap-13soat/shared";
import { processVideoEvent } from "../../application/use-cases/process-video.js";

let running = true;

const workerConcurrency = Math.max(
  1,
  Number(process.env.PROCESSING_WORKER_CONCURRENCY ?? 4),
);
const maxMessagesPerPoll = Math.max(
  1,
  Math.min(
    10,
    Number(process.env.PROCESSING_MAX_MESSAGES_PER_POLL ?? workerConcurrency),
  ),
);
const visibilityTimeoutSeconds = Math.max(
  30,
  Number(process.env.PROCESSING_VISIBILITY_TIMEOUT_SECONDS ?? 120),
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
  const queueUrl = process.env.VIDEO_PROCESSING_QUEUE_URL;

  if (!queueUrl) {
    throw new Error("VIDEO_PROCESSING_QUEUE_URL is required");
  }

  metrics.activeWorkers.set(workerConcurrency);
  let pollFailureCount = 0;

  while (running) {
    try {
      const attributes = await sqsClient.send(
        new GetQueueAttributesCommand({
          QueueUrl: queueUrl,
          AttributeNames: ["ApproximateNumberOfMessages"],
        }),
      );

      metrics.queueSize.set(
        Number(attributes.Attributes?.ApproximateNumberOfMessages ?? 0),
      );

      const response = await sqsClient.send(
        new ReceiveMessageCommand({
          QueueUrl: queueUrl,
          WaitTimeSeconds: 20,
          MaxNumberOfMessages: maxMessagesPerPoll,
          VisibilityTimeout: visibilityTimeoutSeconds,
        }),
      );

      if (!response.Messages || response.Messages.length === 0) {
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
              eventId: string;
              correlationId: string;
              payload: {
                videoId: string;
                userId: string;
                s3Key: string;
                filename: string;
              };
            };

            await processVideoEvent(event);

            await sqsClient.send(
              new DeleteMessageCommand({
                QueueUrl: queueUrl,
                ReceiptHandle: message.ReceiptHandle,
              }),
            );
          } catch (error) {
            console.error("processing failed", error);
          }
        },
      );

      pollFailureCount = 0;
    } catch (error) {
      pollFailureCount += 1;
      const waitMs = Math.min(10000, 250 * 2 ** pollFailureCount);
      console.error("processing consumer poll failed", error);
      await sleep(waitMs);
    }
  }

  metrics.activeWorkers.set(0);
};
