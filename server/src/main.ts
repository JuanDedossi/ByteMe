// Pin server timezone BEFORE any Date/timestamp code runs. Vercel runs
// serverless functions in UTC; without this, local-time date logic in
// sales.stats / sales.routes would compute week/month boundaries in UTC,
// shifting the weekly counter by the TZ offset for users not on UTC.
// Override at runtime by setting the TZ env var (e.g. in Vercel project settings).
if (!process.env.TZ) {
  process.env.TZ = 'America/Argentina/Buenos_Aires';
}

import app from './app';
import { connectDB } from './db';
import { runRenameMarginToMarkupMigration } from './migrations/rename-margin-to-markup';
import { runAuditZeroYieldAndEmptyTraysMigration } from './migrations/audit-zero-yield-and-empty-trays';

const port = process.env.PORT || 3001;

async function main() {
  await connectDB();

  try {
    await runRenameMarginToMarkupMigration();
  } catch (err) {
    console.error('Migration margin→markup failed (non-fatal):', err);
  }

  try {
    await runAuditZeroYieldAndEmptyTraysMigration();
  } catch (err) {
    console.error('Audit migration failed (non-fatal):', err);
  }

  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

main();
