import { describe, expect, it } from "vitest";
import { createDomainEvent } from "./factory.ts";

describe("createDomainEvent", () => {
  it("should create event with required metadata", () => {
    const event = createDomainEvent(
      "VideoUploaded",
      { videoId: "1" },
      "corr-1",
    );

    expect(event.eventId).toBeTypeOf("string");
    expect(event.correlationId).toBe("corr-1");
    expect(event.timestamp).toBeTypeOf("string");
    expect(event.version).toBe("1.0.0");
    expect(event.eventName).toBe("VideoUploaded");
  });

  it("should create correlation id when none is provided", () => {
    const event = createDomainEvent("NotificationRequested", { subject: "s" });

    expect(event.correlationId).toBeTypeOf("string");
    expect(event.correlationId.length).toBeGreaterThan(0);
  });
});
