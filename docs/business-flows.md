# Business Flows

## Authentication Flow

1. The user registers.
2. The user authenticates with email and password.
3. Identity Service returns an access token and a refresh token.
4. The gateway validates JWT on protected routes.

## Upload/Processing Flow

1. The user uploads a video.
2. Video Service persists metadata and the file in the `raw-videos` bucket.
3. The `VideoUploaded` event is published and queued.
4. Processing Service consumes the queue, extracts frames, and generates a ZIP.
5. The ZIP is stored in the `processed-zips` bucket.
6. Status is updated to `COMPLETED` or `FAILED`.

## Query/Download Flow

1. The user queries status by `videoId`.
2. Status Service uses Redis for read caching.
3. When completed, the user downloads the ZIP through the download endpoint.

## Notification Flow

1. Processing Service publishes `NotificationRequested`.
2. Notification Service consumes the queue.
3. A notification is sent to Mailpit.
