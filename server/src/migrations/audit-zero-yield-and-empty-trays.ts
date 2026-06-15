import mongoose from 'mongoose';
import { getTenants } from '../config/tenants';

/**
 * Read-only audit migration: logs recipes with `sellUnit=kg AND yieldGrams <= 0`
 * and trays with `recipes: []`. Does NOT modify any data.
 */
export async function runAuditZeroYieldAndEmptyTraysMigration(): Promise<void> {
  const tenants = getTenants();

  if (tenants.length === 0) {
    // Dev mode — single default DB
    const dbName = process.env.DB_NAME || 'byteme';
    await auditDb(dbName);
    return;
  }

  for (const tenant of tenants) {
    await auditDb(tenant.dbName);
  }
}

async function auditDb(dbName: string): Promise<void> {
  const db = mongoose.connection.useDb(dbName, { useCache: true });

  const invalidRecipes = await db
    .collection('recipes')
    .find({ sellUnit: 'kg', yieldGrams: { $lte: 0 } })
    .project({ _id: 1 })
    .toArray();
  for (const doc of invalidRecipes) {
    console.warn(
      `Migration audit [${dbName}]: recipe ${doc._id} — sellUnit=kg with yieldGrams=0`,
    );
  }

  const emptyTrays = await db
    .collection('trays')
    .find({ recipes: { $size: 0 } })
    .project({ _id: 1 })
    .toArray();
  for (const doc of emptyTrays) {
    console.warn(
      `Migration audit [${dbName}]: tray ${doc._id} — empty recipes array`,
    );
  }
}
