const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const normalizeEmail = (email: string): string =>
  email.trim().toLowerCase();

export const assertValidEmail = (email: string): void => {
  if (!emailPattern.test(email)) {
    throw new Error("Invalid e-mail format");
  }
};
