import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.hoisted(() => vi.fn());
const hashMock = vi.hoisted(() => vi.fn());
const verifyHashMock = vi.hoisted(() => vi.fn());
const signMock = vi.hoisted(() => vi.fn());
const verifyJwtMock = vi.hoisted(() => vi.fn());
const uuidMock = vi.hoisted(() => vi.fn());
const createDomainEventMock = vi.hoisted(() => vi.fn());

vi.mock("../../infrastructure/database/postgres.js", () => ({
  pool: { query: queryMock },
}));

vi.mock("argon2", () => ({
  default: {
    hash: hashMock,
    verify: verifyHashMock,
  },
}));

vi.mock("jsonwebtoken", () => ({
  default: {
    sign: signMock,
    verify: verifyJwtMock,
  },
}));

vi.mock("uuid", () => ({
  v4: uuidMock,
}));

vi.mock("@fiap-13soat/shared", () => ({
  createDomainEvent: createDomainEventMock,
}));

describe("auth use-cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signMock
      .mockReturnValueOnce("access-token")
      .mockReturnValueOnce("refresh-token")
      .mockReturnValueOnce("next-access")
      .mockReturnValueOnce("next-refresh");
    createDomainEventMock.mockReturnValue({ eventName: "UserCreated" });
    uuidMock.mockReturnValue("user-uuid");
  });

  it("registers user and emits domain event", async () => {
    queryMock
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] });
    hashMock.mockResolvedValueOnce("hashed-password");

    const { registerUser } = await import("./auth-use-cases.js");

    const result = await registerUser({
      email: " User@Example.com ",
      password: "secret",
      role: "ADMIN",
      correlationId: "corr-1",
    });

    expect(queryMock).toHaveBeenNthCalledWith(
      1,
      "SELECT id FROM users WHERE email = $1",
      ["user@example.com"],
    );
    expect(hashMock).toHaveBeenCalledWith("secret");
    expect(result.user).toEqual({
      id: "user-uuid",
      email: " User@Example.com ",
      role: "ADMIN",
    });
    expect(createDomainEventMock).toHaveBeenCalledWith(
      "UserCreated",
      { userId: "user-uuid", email: "user@example.com", role: "ADMIN" },
      "corr-1",
    );
  });

  it("fails registration for duplicate e-mail", async () => {
    queryMock.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: "u" }] });
    const { registerUser } = await import("./auth-use-cases.js");

    await expect(
      registerUser({
        email: "dupe@example.com",
        password: "secret",
        correlationId: "corr",
      }),
    ).rejects.toThrow("E-mail already registered");
  });

  it("returns credentials on successful login", async () => {
    queryMock
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: "u-1", password_hash: "hash", role: "USER" }],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] });
    verifyHashMock.mockResolvedValueOnce(true);

    const { loginUser } = await import("./auth-use-cases.js");
    const result = await loginUser({
      email: "user@example.com",
      password: "x",
    });

    expect(verifyHashMock).toHaveBeenCalledWith("hash", "x");
    expect(queryMock).toHaveBeenLastCalledWith(
      "INSERT INTO refresh_tokens (token, user_id, expires_at, revoked) VALUES ($1, $2, $3, FALSE)",
      ["refresh-token", "u-1", expect.any(Date)],
    );
    expect(result).toEqual({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresIn: 900,
      role: "USER",
    });
  });

  it("rejects login when credentials are invalid", async () => {
    queryMock.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    const { loginUser } = await import("./auth-use-cases.js");

    await expect(
      loginUser({ email: "nouser@example.com", password: "x" }),
    ).rejects.toThrow("Invalid credentials");
  });

  it("refreshes token pair when refresh token is valid", async () => {
    queryMock
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            user_id: "u-1",
            revoked: false,
            expires_at: new Date(Date.now() + 60_000),
          },
        ],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] });
    verifyJwtMock.mockReturnValueOnce({ sub: "u-1", role: "ADMIN" });

    const { refreshLogin } = await import("./auth-use-cases.js");
    const result = await refreshLogin("refresh-token");

    expect(verifyJwtMock).toHaveBeenCalled();
    expect(queryMock).toHaveBeenNthCalledWith(
      2,
      "UPDATE refresh_tokens SET revoked = TRUE WHERE token = $1",
      ["refresh-token"],
    );
    expect(result).toEqual({
      accessToken: "next-access",
      refreshToken: "next-refresh",
      expiresIn: 900,
      role: "ADMIN",
    });
  });

  it("rejects refresh token when revoked", async () => {
    queryMock.mockResolvedValueOnce({
      rowCount: 1,
      rows: [
        {
          user_id: "u-1",
          revoked: true,
          expires_at: new Date(Date.now() + 60_000),
        },
      ],
    });

    const { refreshLogin } = await import("./auth-use-cases.js");
    await expect(refreshLogin("token")).rejects.toThrow(
      "Refresh token expired or revoked",
    );
  });

  it("marks refresh token as revoked on logout", async () => {
    queryMock.mockResolvedValueOnce({ rowCount: 1, rows: [] });
    const { logout } = await import("./auth-use-cases.js");

    await logout("token-1");

    expect(queryMock).toHaveBeenCalledWith(
      "UPDATE refresh_tokens SET revoked = TRUE WHERE token = $1",
      ["token-1"],
    );
  });
});
