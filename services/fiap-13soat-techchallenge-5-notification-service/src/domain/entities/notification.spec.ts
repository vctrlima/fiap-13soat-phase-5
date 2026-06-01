import { describe, expect, it } from "vitest";
import { normalizeNotification } from "./notification.js";

describe("notification entity", () => {
  it("trims notification subject and body", () => {
    const result = normalizeNotification({
      subject: "  Subject  ",
      body: "  Body  ",
      to: "user@example.com",
    });

    expect(result).toEqual({
      subject: "Subject",
      body: "Body",
      to: "user@example.com",
    });
  });
});
