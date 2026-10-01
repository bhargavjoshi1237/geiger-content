// Migration config for @geiger/orm. This product's tables live in the dedicated
// "content" Postgres schema of the suite-shared Supabase project, and so does
// its migration ledger (content.geiger_migrations).
import { connectionOptions } from './lib/vector/connection.mjs';

const vector = process.env.GEIGER_VECTOR_DB === '1';
const options = vector ? connectionOptions() : null;

export default vector ? {
  schema: 'content',
  url: options.connectionString,
  ssl: options.ssl,
  migrationsDir: 'postgres/migrations',
  seedsDir: 'postgres/seeds',
} : {
  schema: "content",
  url: process.env.STRING_URI,
};
