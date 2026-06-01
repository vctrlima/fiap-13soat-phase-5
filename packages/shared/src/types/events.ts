export type DomainEventName =
  | "UserCreated"
  | "VideoUploaded"
  | "VideoProcessingStarted"
  | "VideoProcessingCompleted"
  | "VideoProcessingFailed"
  | "NotificationRequested";

export type DomainEvent<TPayload = Record<string, unknown>> = {
  eventId: string;
  correlationId: string;
  eventName: DomainEventName;
  timestamp: string;
  version: string;
  payload: TPayload;
};
