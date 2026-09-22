import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/postgres";

if (connectionString.includes("[YOUR-PASSWORD]") || connectionString.includes("[YOUR-PROJECT-REF]")) {
  connectionString = "postgresql://postgres:postgres@localhost:5432/postgres";
}

const client = postgres(connectionString, {
  prepare: false,
  onnotice: () => { },
  max: 10,
});

export const db = drizzle(client, { schema });