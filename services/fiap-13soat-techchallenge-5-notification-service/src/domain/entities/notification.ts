export type Notification = {
  subject: string;
  body: string;
  to?: string;
};

export const normalizeNotification = (input: Notification): Notification => ({
  subject: input.subject.trim(),
  body: input.body.trim(),
  to: input.to,
});
