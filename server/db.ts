import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

let pool: Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;

if (connectionString) {
  pool = new Pool({ connectionString });
  db = drizzle(pool);
}

export { db, pool };
