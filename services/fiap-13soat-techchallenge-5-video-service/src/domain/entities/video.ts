export const VideoStatuses = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;

export type VideoStatus = (typeof VideoStatuses)[keyof typeof VideoStatuses];

export type VideoRecord = {
  id: string;
  userId: string;
  filename: string;
  s3Key: string;
  status: VideoStatus;
};

export const createPendingVideoRecord = (input: {
  id: string;
  userId: string;
  filename: string;
  s3Key: string;
}): VideoRecord => ({
  id: input.id,
  userId: input.userId,
  filename: input.filename,
  s3Key: input.s3Key,
  status: VideoStatuses.PENDING,
});
