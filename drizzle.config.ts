import { defineConfig } from 'drizzle-kit'

// Drizzle Kit is used for `generate` only: it turns schema.ts into numbered
// .sql files in server/database/migrations. Applying them is wrangler's job
// (`npm run db:migrate` / `db:migrate:remote`), because D1 is only reachable
// through the Worker binding. The sqlite dialect matches D1's SQL.
export default defineConfig({
  dialect: 'sqlite',
  schema: './server/database/schema.ts',
  out: './server/database/migrations',
})
