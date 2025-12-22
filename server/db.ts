import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set.");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // 强制开启 SSL 并允许自签名证书
  ssl: {
    rejectUnauthorized: false
  }
});

export const db = drizzle(pool, { schema });
