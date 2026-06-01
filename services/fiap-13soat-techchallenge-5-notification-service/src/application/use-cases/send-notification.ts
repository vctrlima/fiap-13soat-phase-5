import nodemailer from "nodemailer";
import {
  normalizeNotification,
  type Notification,
} from "../../domain/entities/notification.js";

const transporter = nodemailer.createTransport({
  host: process.env.MAILPIT_HOST ?? "localhost",
  port: Number(process.env.MAILPIT_PORT ?? 1025),
  secure: false,
});

const recipient =
  process.env.NOTIFICATION_DEFAULT_RECIPIENT ?? "user@example.com";

export const sendNotification = async (
  message: Notification,
): Promise<void> => {
  const notification = normalizeNotification(message);

  await transporter.sendMail({
    from: "fiapx@local.dev",
    to: notification.to ?? recipient,
    subject: notification.subject,
    text: notification.body,
  });
};
