import { describe, expect, it } from "vitest";
import { assertValidEmail, normalizeEmail } from "./email.js";

describe("email value object", () => {
  it("normalizes by trimming and lowercasing", () => {
    expect(normalizeEmail("  USER@Example.COM ")).toBe("user@example.com");
  });

  it("accepts valid format", () => {
    expect(() => assertValidEmail("user@example.com")).not.toThrow();
  });

  it("rejects invalid format", () => {
    expect(() => assertValidEmail("invalid-email")).toThrow(
      "Invalid e-mail format",
    );
  });
});
