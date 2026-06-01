export const publicPaths = [
  "/auth/login",
  "/auth/register",
  "/auth/refresh",
  "/health",
  "/metrics",
];

export const requiresAuth = (path: string): boolean => {
  return !publicPaths.some((item) => path.startsWith(item));
};

export const resolveRouteTarget = (
  path: string,
): "identity" | "video" | "status" => {
  if (path.startsWith("/auth")) {
    return "identity";
  }
  if (path.startsWith("/videos")) {
    return "video";
  }
  if (path.startsWith("/status")) {
    return "status";
  }
  throw new Error("route not found");
};
