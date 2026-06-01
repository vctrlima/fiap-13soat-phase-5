import { v4 as uuidv4 } from "uuid";
import type { DomainEvent, DomainEventName } from "../types/events.js";

export const createDomainEvent = <TPayload>(
  eventName: DomainEventName,
  payload: TPayload,
  correlationId?: string,
): DomainEvent<TPayload> => ({
  eventId: uuidv4(),
  correlationId: correlationId ?? uuidv4(),
  eventName,
  timestamp: new Date().toISOString(),
  version: "1.0.0",
  payload,
});
