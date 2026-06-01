import { PutObjectCommand } from "@aws-sdk/client-s3";
import { PublishCommand } from "@aws-sdk/client-sns";
import { SendMessageCommand } from "@aws-sdk/client-sqs";
import {
  createDomainEvent,
  metrics,
  s3Client,
  snsClient,
  sqsClient,
} from "@fiap-13soat/shared";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { createPendingVideoRecord } from "../../domain/entities/video.js";
import { pool } from "../../infrastructure/database/postgres.js";

export const uploadVideo = async (input: {
  userId: string;
  filename: string;
  contentType: string;
  fileBody: Buffer | Readable;
  correlationId: string;
}): Promise<{ videoId: string; status: string }> => {
  const videoId = randomUUID();
  const s3Key = `${videoId}/${input.filename}`;
  const rawBucket = process.env.RAW_VIDEOS_BUCKET ?? "raw-videos";

  await s3Client.send(
    new PutObjectCommand({
      Bucket: rawBucket,
      Key: s3Key,
      Body: input.fileBody,
      ContentType: input.contentType,
    }),
  );

  const videoRecord = createPendingVideoRecord({
    id: videoId,
    userId: input.userId,
    filename: input.filename,
    s3Key,
  });

  await pool.query(
    "INSERT INTO videos (id, user_id, filename, s3_key, status) VALUES ($1, $2, $3, $4, $5)",
    [
      videoRecord.id,
      videoRecord.userId,
      videoRecord.filename,
      videoRecord.s3Key,
      videoRecord.status,
    ],
  );

  const event = createDomainEvent(
    "VideoUploaded",
    { videoId, userId: input.userId, s3Key, filename: input.filename },
    input.correlationId,
  );

  await snsClient.send(
    new PublishCommand({
      TopicArn: process.env.VIDEO_EVENTS_TOPIC_ARN,
      Message: JSON.stringify(event),
      Subject: "VideoUploaded",
    }),
  );

  await sqsClient.send(
    new SendMessageCommand({
      QueueUrl: process.env.VIDEO_PROCESSING_QUEUE_URL,
      MessageBody: JSON.stringify(event),
      MessageAttributes: {
        correlationId: { DataType: "String", StringValue: event.correlationId },
      },
    }),
  );

  metrics.uploadsTotal.inc();

  return { videoId, status: videoRecord.status };
};
