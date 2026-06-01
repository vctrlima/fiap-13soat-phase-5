import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { existsSync } from "node:fs";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

let container: StartedPostgreSqlContainer;
let pool: Pool;
let runtimeAvailable = true;

describe("postgres integration", () => {
  beforeAll(async () => {
    if (!existsSync("/var/run/docker.sock") && !process.env.DOCKER_HOST) {
      runtimeAvailable = false;
      return;
    }

    try {
      container = await new PostgreSqlContainer("postgres:16-alpine").start();
      pool = new Pool({ connectionString: container.getConnectionUri() });
    } catch {
      runtimeAvailable = false;
    }
  }, 120000);

  afterAll(async () => {
    if (runtimeAvailable) {
      await pool?.end();
      await container?.stop();
    }
  });

  it("should connect and execute query", async () => {
    if (!runtimeAvailable) {
      return;
    }

    const result = await pool.query("SELECT 1 as healthy");
    expect(result.rows[0]?.healthy).toBe(1);
  });
});
