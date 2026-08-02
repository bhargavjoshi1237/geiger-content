// Migration config for @geiger/orm. This product's tables live in the dedicated
// "content" Postgres schema of the suite-shared Supabase project, and so does
// its migration ledger (content.geiger_migrations).
export default {
  schema: "content",
  url: process.env.STRING_URI,
};
