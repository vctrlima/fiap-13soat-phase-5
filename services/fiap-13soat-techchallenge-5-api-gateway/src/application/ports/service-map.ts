export const serviceMap = {
  identity: process.env.IDENTITY_SERVICE_URL ?? "http://identity-service:3001",
  video: process.env.VIDEO_SERVICE_URL ?? "http://video-service:3002",
  status: process.env.STATUS_SERVICE_URL ?? "http://status-service:3004",
} as const;
