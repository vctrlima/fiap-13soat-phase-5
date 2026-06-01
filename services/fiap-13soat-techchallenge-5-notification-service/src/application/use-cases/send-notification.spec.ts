import { beforeEach, describe, expect, it, vi } from "vitest";

const sendMailMock = vi.hoisted(() => vi.fn());

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: sendMailMock,
    })),
  },
}));

describe("sendNotification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendMailMock.mockResolvedValue({});
    process.env.NOTIFICATION_DEFAULT_RECIPIENT = "default@example.com";
  });

  it("sends normalized notification to explicit recipient", async () => {
    const { sendNotification } = await import("./send-notification.js");

    await sendNotification({
      subject: "  Test Subject ",
      body: "  Hello! ",
      to: "target@example.com",
    });

    expect(sendMailMock).toHaveBeenCalledWith({
      from: "fiapx@local.dev",
      to: "target@example.com",
      subject: "Test Subject",
      text: "Hello!",
    });
  });

  it("uses default recipient when to is missing", async () => {
    const { sendNotification } = await import("./send-notification.js");

    await sendNotification({
      subject: "Subject",
      body: "Body",
    });

    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: "default@example.com" }),
    );
  });
});
