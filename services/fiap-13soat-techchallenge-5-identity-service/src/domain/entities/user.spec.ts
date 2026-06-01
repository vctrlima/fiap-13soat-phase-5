import { describe, expect, it } from "vitest";
import type { User } from "./user.js";

describe("user entity shape", () => {
  it("supports role and timestamps", () => {
    const user: User = {
      id: "u-1",
      email: "user@example.com",
      passwordHash: "hash",
      role: "USER",
      createdAt: new Date(),
    };

    expect(user.role).toBe("USER");
    expect(user.createdAt).toBeInstanceOf(Date);
  });
});
