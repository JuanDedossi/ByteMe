import mongoose from 'mongoose';
import { getTenants } from '../config/tenants';

/**
 * Idempotent migration: renames `marginPercentage` → `markupPercentage`
 * on ProfitRule, Recipe (enriched field), and Tray (enriched field) collections.
 *
 * Uses aggregation pipeline update for atomic rename+unset.
 * Re-running is a no-op because it only targets docs where
 * `markupPercentage` does NOT exist yet.
 */
export async function runRenameMarginToMarkupMigration(): Promise<void> {
  const tenants = getTenants();

  if (tenants.length === 0) {
    // Dev mode — single default DB
    const dbName = process.env.DB_NAME || 'byteme';
    await migrateDb(dbName);
    return;
  }

  for (const tenant of tenants) {
    await migrateDb(tenant.dbName);
  }
}

async function migrateDb(dbName: string): Promise<void> {
  const db = mongoose.connection.useDb(dbName, { useCache: true });

  // Mongoose default pluralization: ProfitRule → profitrules, Recipe → recipes, Tray → trays
  const collections = ['profitrules', 'recipes', 'trays'] as const;

  for (const collName of collections) {
    const result = await db.collection(collName).updateMany(
      { markupPercentage: { $exists: false }, marginPercentage: { $exists: true } },
      [
        { $set: { markupPercentage: '$marginPercentage' } },
        { $unset: 'marginPercentage' },
      ],
    );
    if (result.modifiedCount > 0) {
      console.log(
        `Migration [${dbName}]: ${collName} — renamed ${result.modifiedCount} documents`,
      );
    }
  }
}
