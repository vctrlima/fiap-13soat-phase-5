import { describe, expect, it } from "vitest";
import { ProcessingStatuses, makeZipKey } from "./video-processing.js";

describe("video processing entity", () => {
  it("builds zip key by video id", () => {
    expect(makeZipKey("video-1")).toBe("video-1/video-1.zip");
  });

  it("exposes known statuses", () => {
    expect(ProcessingStatuses.PROCESSING).toBe("PROCESSING");
    expect(ProcessingStatuses.COMPLETED).toBe("COMPLETED");
    expect(ProcessingStatuses.FAILED).toBe("FAILED");
  });
});
