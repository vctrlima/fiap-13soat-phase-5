import { describe, expect, it } from "vitest";
import {
  publicPaths,
  requiresAuth,
  resolveRouteTarget,
} from "./routing-policy.js";

describe("routing-policy", () => {
  it("exposes known public paths", () => {
    expect(publicPaths).toContain("/auth/login");
    expect(publicPaths).toContain("/metrics");
  });

  it("requires auth only for non-public routes", () => {
    expect(requiresAuth("/auth/login")).toBe(false);
    expect(requiresAuth("/health/live")).toBe(false);
    expect(requiresAuth("/videos/upload")).toBe(true);
  });

  it("resolves route target by prefix", () => {
    expect(resolveRouteTarget("/auth/login")).toBe("identity");
    expect(resolveRouteTarget("/videos/upload")).toBe("video");
    expect(resolveRouteTarget("/status/history")).toBe("status");
  });

  it("throws for unknown route", () => {
    expect(() => resolveRouteTarget("/unknown")).toThrow("route not found");
  });
});
