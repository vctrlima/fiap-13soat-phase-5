import { describe, expect, it } from "vitest";
import { buildStatusCacheKey, hasDownloadableZip } from "./video-status.js";

describe("video status entity", () => {
  it("builds cache key", () => {
    expect(buildStatusCacheKey("v-1")).toBe("status:v-1");
  });

  it("checks downloadable zip availability", () => {
    expect(hasDownloadableZip({ zip_key: "v-1/v-1.zip" })).toBe(true);
    expect(hasDownloadableZip({ zip_key: null })).toBe(false);
    expect(hasDownloadableZip(null)).toBe(false);
  });
});
