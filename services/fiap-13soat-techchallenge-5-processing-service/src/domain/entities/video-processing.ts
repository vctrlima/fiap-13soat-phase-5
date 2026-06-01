export const ProcessingStatuses = {
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;

export type ProcessingStatus =
  (typeof ProcessingStatuses)[keyof typeof ProcessingStatuses];

export type VideoProcessingRequest = {
  eventId: string;
  correlationId: string;
  payload: { videoId: string; userId: string; s3Key: string; filename: string };
};

export const makeZipKey = (videoId: string): string =>
  `${videoId}/${videoId}.zip`;
