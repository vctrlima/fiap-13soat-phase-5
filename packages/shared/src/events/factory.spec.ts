import { describe, expect, it } from "vitest";
import { createDomainEvent } from "./factory.js";

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
});
