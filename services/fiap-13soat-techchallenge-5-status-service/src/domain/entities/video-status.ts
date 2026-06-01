export type VideoStatusView = {
  video_id: string;
  user_id: string;
  status: string;
  zip_key: string | null;
  error_message: string | null;
  started_at: string | null;
  finished_at: string | null;
  updated_at: string;
};

export const buildStatusCacheKey = (videoId: string): string =>
  `status:${videoId}`;

export const hasDownloadableZip = (
  status: { zip_key?: string | null } | null,
): boolean => {
  return Boolean(status?.zip_key);
};
