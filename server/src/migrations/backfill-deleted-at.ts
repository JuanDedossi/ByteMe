import mongoose, { Types } from 'mongoose';
import { getTenants } from '../config/tenants';
import { connectDB } from '../db';

/** Backfills nullable sale deletion state and stable ids for legacy sale items. */
export async function runBackfillDeletedAtMigration(): Promise<void> {
  const tenants = getTenants();
  if (tenants.length === 0) {
    await backfillDb(process.env.DB_NAME || 'byteme');
    return;
  }

  for (const tenant of tenants) {
    await backfillDb(tenant.dbName);
  }
}

async function backfillDb(dbName: string): Promise<void> {
  const db = mongoose.connection.useDb(dbName, { useCache: true });
  const sales = db.collection('sales');
  let processed = 0;
  let updated = 0;

  const cursor = sales.find({});
  for await (const sale of cursor) {
    const items = Array.isArray(sale.items) ? sale.items : [];
    const needsItemIds = items.some((item) => !item?._id);
    const needsDeletedAt = !Object.prototype.hasOwnProperty.call(sale, 'deletedAt');
    if (!needsItemIds && !needsDeletedAt) {
      processed++;
      continue;
    }

    const update: Record<string, unknown> = {};
    if (needsDeletedAt) update.deletedAt = null;
    if (needsItemIds) {
      update.items = items.map((item) => ({
        ...item,
        _id: item?._id ?? new Types.ObjectId(),
      }));
    }
    await sales.updateOne({ _id: sale._id }, { $set: update });
    updated++;
    processed++;
  }

  console.log(
    `Migration backfill-deleted-at [${dbName}]: processed ${processed} sales, updated ${updated}`,
  );
}

async function main(): Promise<void> {
  await connectDB();
  try {
    await runBackfillDeletedAtMigration();
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('backfill-deleted-at failed:', err);
    process.exit(1);
  });
}
