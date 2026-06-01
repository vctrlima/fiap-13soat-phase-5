import { v4 as uuidv4 } from "uuid";
export const createDomainEvent = (eventName, payload, correlationId) => ({
  eventId: uuidv4(),
  correlationId: correlationId ?? uuidv4(),
  eventName,
  timestamp: new Date().toISOString(),
  version: "1.0.0",
  payload,
});
