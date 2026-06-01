import { Pool } from "pg";

export const pool = new Pool({
  host: process.env.POSTGRES_HOST ?? "localhost",
  port: Number(process.env.POSTGRES_PORT ?? 5432),
  user: process.env.POSTGRES_USER ?? "fiap",
  password: process.env.POSTGRES_PASSWORD ?? "fiap",
  database: process.env.POSTGRES_DB ?? "fiapx",
});

export const initVideoSchema = async (): Promise<void> => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS videos (
      id UUID PRIMARY KEY,
      user_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      s3_key TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
};
