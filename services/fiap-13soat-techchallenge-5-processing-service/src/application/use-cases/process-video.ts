import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { SendMessageCommand } from "@aws-sdk/client-sqs";
import {
  createDomainEvent,
  metrics,
  s3Client,
  sqsClient,
} from "@fiap-13soat/shared";
import { execFile } from "node:child_process";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import {
  makeZipKey,
  ProcessingStatuses,
  type VideoProcessingRequest,
} from "../../domain/entities/video-processing.js";
import { pool } from "../../infrastructure/database/postgres.js";

const execFileAsync = promisify(execFile);

const readStreamToBuffer = async (
  stream: NodeJS.ReadableStream,
): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

const retry = async <T>(fn: () => Promise<T>, retries = 3): Promise<T> => {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempt += 1;
      if (attempt >= retries) {
        throw error;
      }
      const delay = 2 ** attempt * 500;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

export const processVideoEvent = async (
  event: VideoProcessingRequest,
): Promise<void> => {
  const idempotency = await pool.query(
    "SELECT event_id FROM processed_events WHERE event_id = $1",
    [event.eventId],
  );
  if (idempotency.rowCount) {
    return;
  }

  const startedAt = Date.now();
  metrics.processingStartedTotal.inc();

  await pool.query(
    `
      INSERT INTO video_status (video_id, user_id, status, started_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      ON CONFLICT (video_id) DO UPDATE SET status = $3, started_at = NOW(), updated_at = NOW(), error_message = NULL
    `,
    [
      event.payload.videoId,
      event.payload.userId,
      ProcessingStatuses.PROCESSING,
    ],
  );

  const startedEvent = createDomainEvent(
    "VideoProcessingStarted",
    { videoId: event.payload.videoId, userId: event.payload.userId },
    event.correlationId,
  );
  await sqsClient.send(
    new SendMessageCommand({
      QueueUrl: process.env.VIDEO_NOTIFICATION_QUEUE_URL,
      MessageBody: JSON.stringify(startedEvent),
    }),
  );

  const workDir = join("/tmp", event.payload.videoId);
  const framesDir = join(workDir, "frames");
  const sourceVideo = join(workDir, event.payload.filename);
  let processedSuccessfully = false;

  try {
    await mkdir(framesDir, { recursive: true });

    await retry(async () => {
      const object = await s3Client.send(
        new GetObjectCommand({
          Bucket: process.env.RAW_VIDEOS_BUCKET ?? "raw-videos",
          Key: event.payload.s3Key,
        }),
      );

      if (!object.Body) {
        throw new Error("Video body missing from S3");
      }

      const fileBuffer = await readStreamToBuffer(
        object.Body as NodeJS.ReadableStream,
      );
      await writeFile(sourceVideo, fileBuffer);
    });

    await execFileAsync("ffmpeg", [
      "-i",
      sourceVideo,
      "-vf",
      "fps=1",
      "-y",
      join(framesDir, "frame_%04d.png"),
    ]);

    const zipFile = join(workDir, `${event.payload.videoId}.zip`);
    await execFileAsync("zip", [
      "-j",
      zipFile,
      ...(await readdir(framesDir)).map((name) => join(framesDir, name)),
    ]);

    const zipBuffer = await readFile(zipFile);
    const zipKey = makeZipKey(event.payload.videoId);

    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.PROCESSED_ZIPS_BUCKET ?? "processed-zips",
        Key: zipKey,
        Body: zipBuffer,
        ContentType: "application/zip",
      }),
    );

    await pool.query(
      "UPDATE video_status SET status = $2, zip_key = $3, finished_at = NOW(), updated_at = NOW() WHERE video_id = $1",
      [event.payload.videoId, ProcessingStatuses.COMPLETED, zipKey],
    );

    const completedEvent = createDomainEvent(
      "VideoProcessingCompleted",
      { videoId: event.payload.videoId, userId: event.payload.userId, zipKey },
      event.correlationId,
    );

    const notification = createDomainEvent(
      "NotificationRequested",
      {
        channel: "email",
        userId: event.payload.userId,
        subject: "Video processing completed",
        message: `Video ${event.payload.filename} foi processado com sucesso`,
      },
      event.correlationId,
    );

    await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: process.env.VIDEO_NOTIFICATION_QUEUE_URL,
        MessageBody: JSON.stringify(notification),
      }),
    );

    await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: process.env.VIDEO_NOTIFICATION_QUEUE_URL,
        MessageBody: JSON.stringify(completedEvent),
      }),
    );

    metrics.processingCompletedTotal.inc();
    processedSuccessfully = true;
  } catch (error) {
    await pool.query(
      "UPDATE video_status SET status = $2, error_message = $3, finished_at = NOW(), updated_at = NOW() WHERE video_id = $1",
      [
        event.payload.videoId,
        ProcessingStatuses.FAILED,
        (error as Error).message,
      ],
    );

    const failedEvent = createDomainEvent(
      "VideoProcessingFailed",
      {
        videoId: event.payload.videoId,
        userId: event.payload.userId,
        error: (error as Error).message,
      },
      event.correlationId,
    );

    await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: process.env.VIDEO_NOTIFICATION_QUEUE_URL,
        MessageBody: JSON.stringify(failedEvent),
      }),
    );

    metrics.processingFailedTotal.inc();
    throw error;
  } finally {
    metrics.processingDurationSeconds.observe((Date.now() - startedAt) / 1000);
    if (processedSuccessfully) {
      await pool.query(
        "INSERT INTO processed_events (event_id) VALUES ($1) ON CONFLICT DO NOTHING",
        [event.eventId],
      );
    }
    await rm(workDir, { recursive: true, force: true });
  }
};
