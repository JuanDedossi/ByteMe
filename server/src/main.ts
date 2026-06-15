import app from './app';
import { connectDB } from './db';
import { runRenameMarginToMarkupMigration } from './migrations/rename-margin-to-markup';

const port = process.env.PORT || 3001;

async function main() {
  await connectDB();

  try {
    await runRenameMarginToMarkupMigration();
  } catch (err) {
    console.error('Migration margin→markup failed (non-fatal):', err);
  }

  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

main();
