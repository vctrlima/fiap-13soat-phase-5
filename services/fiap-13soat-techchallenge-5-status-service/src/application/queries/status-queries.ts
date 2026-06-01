import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "@fiap-13soat/shared";
import {
  buildStatusCacheKey,
  hasDownloadableZip,
  type VideoStatusView,
} from "../../domain/entities/video-status.js";
import { redis } from "../../infrastructure/cache/redis.js";
import { pool } from "../../infrastructure/database/postgres.js";

const cacheTtlSeconds = 20;

export const getVideoStatus = async (videoId: string) => {
  const cacheKey = buildStatusCacheKey(videoId);
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached) as VideoStatusView;
  }

  const result = await pool.query(
    "SELECT * FROM video_status WHERE video_id = $1",
    [videoId],
  );
  if (!result.rowCount) {
    return null;
  }

  await redis.set(
    cacheKey,
    JSON.stringify(result.rows[0]),
    "EX",
    cacheTtlSeconds,
  );
  return result.rows[0] as VideoStatusView;
};

export const getHistory = async (userId: string) => {
  const result = await pool.query(
    "SELECT * FROM video_status WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 100",
    [userId],
  );
  return result.rows;
};

export const getDownloadBuffer = async (
  videoId: string,
): Promise<Buffer | null> => {
  const status = await getVideoStatus(videoId);
  if (!status || !hasDownloadableZip(status)) {
    return null;
  }

  const zipKey = status.zip_key;
  if (!zipKey) {
    return null;
  }

  const object = await s3Client.send(
    new GetObjectCommand({
      Bucket: process.env.PROCESSED_ZIPS_BUCKET ?? "processed-zips",
      Key: zipKey,
    }),
  );

  if (!object.Body) {
    return null;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of object.Body as NodeJS.ReadableStream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
};
