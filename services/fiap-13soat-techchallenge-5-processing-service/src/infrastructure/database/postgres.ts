import { Pool } from "pg";

export const pool = new Pool({
  host: process.env.POSTGRES_HOST ?? "localhost",
  port: Number(process.env.POSTGRES_PORT ?? 5432),
  user: process.env.POSTGRES_USER ?? "fiap",
  password: process.env.POSTGRES_PASSWORD ?? "fiap",
  database: process.env.POSTGRES_DB ?? "fiapx",
});

export const initProcessingSchema = async (): Promise<void> => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS video_status (
        video_id UUID PRIMARY KEY,
        user_id TEXT NOT NULL,
        status TEXT NOT NULL,
        zip_key TEXT,
        error_message TEXT,
        started_at TIMESTAMP,
        finished_at TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code !== "23505") {
      throw error;
    }
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS processed_events (
      event_id TEXT PRIMARY KEY,
      processed_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
};
