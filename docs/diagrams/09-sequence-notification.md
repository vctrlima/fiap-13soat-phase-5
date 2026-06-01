```mermaid
sequenceDiagram
  participant PS as Processing Service
  participant Q as SQS video-notification
  participant NS as Notification Service
  participant MP as Mailpit

  PS->>Q: NotificationRequested
  Q-->>NS: consume
  NS->>MP: SMTP send
  MP-->>NS: accepted
```
