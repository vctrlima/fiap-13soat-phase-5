import { createDomainEvent } from "@fiap-13soat/shared";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import type { UserRole } from "../../domain/entities/user.js";
import {
  assertValidEmail,
  normalizeEmail,
} from "../../domain/value-objects/email.js";
import { pool } from "../../infrastructure/database/postgres.js";

type RegisterInput = {
  email: string;
  password: string;
  role?: UserRole;
  correlationId: string;
};
type LoginInput = { email: string; password: string };

type TokenPair = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

const accessSecret = process.env.JWT_SECRET ?? "changeme-secret";
const refreshSecret =
  process.env.JWT_REFRESH_SECRET ?? "changeme-refresh-secret";

const signTokens = (userId: string, role: UserRole): TokenPair => {
  const expiresIn = 60 * 15;
  const accessToken = jwt.sign({ sub: userId, role }, accessSecret, {
    expiresIn,
  });
  const refreshToken = jwt.sign(
    { sub: userId, role, tokenType: "refresh" },
    refreshSecret,
    {
      expiresIn: "7d",
    },
  );
  return { accessToken, refreshToken, expiresIn };
};

export const registerUser = async ({
  email,
  password,
  role,
  correlationId,
}: RegisterInput) => {
  const canonicalEmail = normalizeEmail(email);
  assertValidEmail(canonicalEmail);

  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [
    canonicalEmail,
  ]);
  if (existing.rowCount && existing.rowCount > 0) {
    throw new Error("E-mail already registered");
  }

  const id = uuidv4();
  const passwordHash = await argon2.hash(password);
  const selectedRole = role ?? "USER";

  await pool.query(
    "INSERT INTO users (id, email, password_hash, role) VALUES ($1, $2, $3, $4)",
    [id, canonicalEmail, passwordHash, selectedRole],
  );

  return {
    user: { id, email, role: selectedRole },
    event: createDomainEvent(
      "UserCreated",
      { userId: id, email: canonicalEmail, role: selectedRole },
      correlationId,
    ),
  };
};

export const loginUser = async ({ email, password }: LoginInput) => {
  const canonicalEmail = normalizeEmail(email);
  assertValidEmail(canonicalEmail);

  const result = await pool.query(
    "SELECT id, password_hash, role FROM users WHERE email = $1",
    [canonicalEmail],
  );

  if (!result.rowCount) {
    throw new Error("Invalid credentials");
  }

  const user = result.rows[0] as {
    id: string;
    password_hash: string;
    role: UserRole;
  };
  const ok = await argon2.verify(user.password_hash, password);
  if (!ok) {
    throw new Error("Invalid credentials");
  }

  const pair = signTokens(user.id, user.role);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await pool.query(
    "INSERT INTO refresh_tokens (token, user_id, expires_at, revoked) VALUES ($1, $2, $3, FALSE)",
    [pair.refreshToken, user.id, expiresAt],
  );

  return { ...pair, role: user.role };
};

export const refreshLogin = async (
  token: string,
): Promise<TokenPair & { role: UserRole }> => {
  const tokenState = await pool.query(
    "SELECT user_id, revoked, expires_at FROM refresh_tokens WHERE token = $1",
    [token],
  );

  if (!tokenState.rowCount) {
    throw new Error("Refresh token invalid");
  }

  const item = tokenState.rows[0] as {
    user_id: string;
    revoked: boolean;
    expires_at: Date;
  };
  if (item.revoked || new Date(item.expires_at).getTime() < Date.now()) {
    throw new Error("Refresh token expired or revoked");
  }

  const decoded = jwt.verify(token, refreshSecret) as {
    sub: string;
    role: UserRole;
  };
  const nextPair = signTokens(decoded.sub, decoded.role);

  await pool.query(
    "UPDATE refresh_tokens SET revoked = TRUE WHERE token = $1",
    [token],
  );
  await pool.query(
    "INSERT INTO refresh_tokens (token, user_id, expires_at, revoked) VALUES ($1, $2, $3, FALSE)",
    [
      nextPair.refreshToken,
      decoded.sub,
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    ],
  );

  return { ...nextPair, role: decoded.role };
};

export const logout = async (token: string): Promise<void> => {
  await pool.query(
    "UPDATE refresh_tokens SET revoked = TRUE WHERE token = $1",
    [token],
  );
};
