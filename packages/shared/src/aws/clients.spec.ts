import { afterEach, describe, expect, it, vi } from "vitest";

const s3CtorMock = vi.hoisted(() => vi.fn());
const sqsCtorMock = vi.hoisted(() => vi.fn());
const snsCtorMock = vi.hoisted(() => vi.fn());
const secretsCtorMock = vi.hoisted(() => vi.fn());

vi.mock("@aws-sdk/client-s3", () => ({ S3Client: s3CtorMock }));
vi.mock("@aws-sdk/client-sqs", () => ({ SQSClient: sqsCtorMock }));
vi.mock("@aws-sdk/client-sns", () => ({ SNSClient: snsCtorMock }));
vi.mock("@aws-sdk/client-secrets-manager", () => ({
  SecretsManagerClient: secretsCtorMock,
}));

describe("aws clients", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("creates clients with defaults", async () => {
    delete process.env.AWS_REGION;
    delete process.env.AWS_ENDPOINT;
    delete process.env.AWS_MAX_ATTEMPTS;

    await import("./clients.ts");

    expect(s3CtorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        region: "us-east-1",
        endpoint: "http://localhost:4566",
        maxAttempts: 3,
        forcePathStyle: true,
      }),
    );
    expect(sqsCtorMock).toHaveBeenCalledTimes(1);
    expect(snsCtorMock).toHaveBeenCalledTimes(1);
    expect(secretsCtorMock).toHaveBeenCalledTimes(1);
  });

  it("respects env configuration", async () => {
    vi.stubEnv("AWS_REGION", "sa-east-1");
    vi.stubEnv("AWS_ENDPOINT", "http://ministack:4566");
    vi.stubEnv("AWS_MAX_ATTEMPTS", "7");
    vi.stubEnv("AWS_ACCESS_KEY_ID", "id");
    vi.stubEnv("AWS_SECRET_ACCESS_KEY", "secret");

    await import("./clients.ts");

    expect(s3CtorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        region: "sa-east-1",
        endpoint: "http://ministack:4566",
        maxAttempts: 7,
        credentials: { accessKeyId: "id", secretAccessKey: "secret" },
      }),
    );
  });
});
