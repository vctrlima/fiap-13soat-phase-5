import { describe, expect, it } from "vitest";
import { VideoStatuses, createPendingVideoRecord } from "./video.js";

describe("video entity", () => {
  it("creates pending video record", () => {
    const result = createPendingVideoRecord({
      id: "v-1",
      userId: "u-1",
      filename: "movie.mp4",
      s3Key: "v-1/movie.mp4",
    });

    expect(result).toEqual({
      id: "v-1",
      userId: "u-1",
      filename: "movie.mp4",
      s3Key: "v-1/movie.mp4",
      status: VideoStatuses.PENDING,
    });
  });
});
