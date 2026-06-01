import { beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.hoisted(() => vi.fn());
const commandMock = vi.hoisted(() => vi.fn());

vi.mock("./clients.js", () => ({
  secretsClient: { send: sendMock },
}));

vi.mock("@aws-sdk/client-secrets-manager", () => ({
  GetSecretValueCommand: commandMock,
}));

describe("loadAppSecrets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    commandMock.mockImplementation((input: unknown) => ({ input }));
  });

  it("returns parsed secret when SecretString exists", async () => {
    sendMock.mockResolvedValueOnce({ SecretString: '{"A":"1"}' });

    const { loadAppSecrets } = await import("./secrets.ts");
    const result = await loadAppSecrets("app/secret");

    expect(commandMock).toHaveBeenCalledWith({ SecretId: "app/secret" });
    expect(result).toEqual({ A: "1" });
  });

  it("returns empty object when secret string is missing", async () => {
    sendMock.mockResolvedValueOnce({ SecretString: undefined });

    const { loadAppSecrets } = await import("./secrets.ts");
    const result = await loadAppSecrets();

    expect(result).toEqual({});
  });

  it("returns empty object on client errors", async () => {
    sendMock.mockRejectedValueOnce(new Error("boom"));

    const { loadAppSecrets } = await import("./secrets.ts");
    const result = await loadAppSecrets();

    expect(result).toEqual({});
  });
});
