export type UserRole = "ADMIN" | "USER";

export type User = {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: Date;
};
