import type { DomainEvent, DomainEventName } from "../types/events.js";
export declare const createDomainEvent: <TPayload>(
  eventName: DomainEventName,
  payload: TPayload,
  correlationId?: string,
) => DomainEvent<TPayload>;
