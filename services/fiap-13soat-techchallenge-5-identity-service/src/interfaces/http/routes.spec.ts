import { beforeEach, describe, expect, it, vi } from "vitest";

const registerUserMock = vi.hoisted(() => vi.fn());
const loginUserMock = vi.hoisted(() => vi.fn());
const refreshLoginMock = vi.hoisted(() => vi.fn());
const logoutMock = vi.hoisted(() => vi.fn());
const correlationMock = vi.hoisted(() => vi.fn());

vi.mock("../../application/use-cases/auth-use-cases.js", () => ({
  registerUser: registerUserMock,
  loginUser: loginUserMock,
  refreshLogin: refreshLoginMock,
  logout: logoutMock,
}));

vi.mock("@fiap-13soat/shared", () => ({
  correlationFromHeaders: correlationMock,
  registry: { contentType: "text/plain", metrics: () => "m" },
}));

type Handler = (request: any, reply: any) => Promise<any>;

const makeReply = () => ({
  statusCode: 200,
  payload: undefined as unknown,
  headers: {} as Record<string, string>,
  code(status: number) {
    this.statusCode = status;
    return this;
  },
  send(payload?: unknown) {
    this.payload = payload;
    return this;
  },
  header(key: string, value: string) {
    this.headers[key] = value;
    return this;
  },
});

describe("registerIdentityRoutes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    correlationMock.mockReturnValue("corr-1");
  });

  it("wires register/login/refresh/logout endpoints", async () => {
    const postHandlers: Record<string, Handler> = {};
    const getHandlers: Record<string, Handler> = {};

    const app = {
      get: vi.fn((path: string, handler: Handler) => {
        getHandlers[path] = handler;
      }),
      post: vi.fn((path: string, handler: Handler) => {
        postHandlers[path] = handler;
      }),
    };

    const { registerIdentityRoutes } = await import("./routes.js");
    registerIdentityRoutes(app as never);

    registerUserMock.mockResolvedValueOnce({ ok: true });
    const registerReply = makeReply();
    await postHandlers["/auth/register"](
      { body: { email: "u@e.com", password: "p" }, headers: {} },
      registerReply,
    );
    expect(registerReply.statusCode).toBe(201);
    expect(registerUserMock).toHaveBeenCalledWith({
      email: "u@e.com",
      password: "p",
      role: undefined,
      correlationId: "corr-1",
    });

    loginUserMock.mockResolvedValueOnce({ accessToken: "a" });
    const loginReply = makeReply();
    await postHandlers["/auth/login"](
      { body: { email: "u@e.com", password: "p" } },
      loginReply,
    );
    expect(loginReply.payload).toEqual({ accessToken: "a" });

    refreshLoginMock.mockResolvedValueOnce({ accessToken: "n" });
    const refreshReply = makeReply();
    await postHandlers["/auth/refresh"](
      { body: { refreshToken: "r" } },
      refreshReply,
    );
    expect(refreshReply.payload).toEqual({ accessToken: "n" });

    const logoutReply = makeReply();
    await postHandlers["/auth/logout"](
      { body: { refreshToken: "r" } },
      logoutReply,
    );
    expect(logoutMock).toHaveBeenCalledWith("r");
    expect(logoutReply.statusCode).toBe(204);

    const metricsReply = makeReply();
    const metricsPayload = await getHandlers["/metrics"]({}, metricsReply);
    expect(metricsReply.headers["Content-Type"]).toBe("text/plain");
    expect(metricsPayload).toBe("m");
  });

  it("maps register errors to 400 and login/refresh errors to 401", async () => {
    const postHandlers: Record<string, Handler> = {};
    const app = {
      get: vi.fn(),
      post: vi.fn((path: string, handler: Handler) => {
        postHandlers[path] = handler;
      }),
    };

    const { registerIdentityRoutes } = await import("./routes.js");
    registerIdentityRoutes(app as never);

    registerUserMock.mockRejectedValueOnce(new Error("bad register"));
    const registerReply = makeReply();
    await postHandlers["/auth/register"](
      { body: {}, headers: {} },
      registerReply,
    );
    expect(registerReply.statusCode).toBe(400);

    loginUserMock.mockRejectedValueOnce(new Error("bad login"));
    const loginReply = makeReply();
    await postHandlers["/auth/login"]({ body: {} }, loginReply);
    expect(loginReply.statusCode).toBe(401);

    refreshLoginMock.mockRejectedValueOnce(new Error("bad refresh"));
    const refreshReply = makeReply();
    await postHandlers["/auth/refresh"]({ body: {} }, refreshReply);
    expect(refreshReply.statusCode).toBe(401);
  });
});
