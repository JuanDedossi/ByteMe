import mongoose, { Schema, Types } from 'mongoose';
import { getTenants } from '../config/tenants';
import { roundCurrency } from '../utils/currency';
import { connectDB } from '../db';

/**
 * One-shot backfill: populate `costAtSale`, `subtotalCost`, and `totalCost`
 * on legacy sales using the CURRENT recipe/tray costs as a best-effort
 * baseline. Idempotent: re-running is a no-op for already-populated docs.
 *
 * Runs per tenant (or default DB in dev mode). Models are instantiated
 * directly from the tenant connection — service-layer helpers are
 * intentionally NOT imported because they depend on AsyncLocalStorage
 * tenant context which is only valid inside request handling.
 */
export async function runBackfillSaleItemCostsMigration(): Promise<void> {
  const tenants = getTenants();

  if (tenants.length === 0) {
    // Dev mode — single default DB.
    const dbName = process.env.DB_NAME || 'byteme';
    await backfillDb(dbName);
    return;
  }

  for (const tenant of tenants) {
    await backfillDb(tenant.dbName);
  }
}

const MAX_SUB_RECIPE_DEPTH = 10;

interface TenantModels {
  Ingredient: mongoose.Model<any>;
  Complement: mongoose.Model<any>;
  Recipe: mongoose.Model<any>;
  Tray: mongoose.Model<any>;
  Sale: mongoose.Model<any>;
}

function getTenantModels(db: mongoose.Connection): TenantModels {
  const Ingredient =
    (db.models['Ingredient'] as mongoose.Model<any> | undefined) ??
    db.model(
      'Ingredient',
      new Schema(
        {
          name: String,
          unit: String,
          costPerKg: Number,
          costPerUnit: Number,
        },
        { strict: false },
      ),
    );

  const Complement =
    (db.models['Complement'] as mongoose.Model<any> | undefined) ??
    db.model(
      'Complement',
      new Schema(
        {
          name: String,
          unit: String,
          costPerUnit: Number,
        },
        { strict: false },
      ),
    );

  const Recipe =
    (db.models['Recipe'] as mongoose.Model<any> | undefined) ??
    db.model(
      'Recipe',
      new Schema(
        {
          name: String,
          ingredients: [
            new Schema(
              {
                type: { type: String, default: 'ingredient' },
                ingredientId: Schema.Types.ObjectId,
                recipeId: Schema.Types.ObjectId,
                quantity: Number,
              },
              { strict: false, _id: false },
            ),
          ],
          complements: [
            new Schema(
              {
                complementId: Schema.Types.ObjectId,
                quantity: Number,
              },
              { strict: false, _id: false },
            ),
          ],
          sellUnit: { type: String, default: 'unidad' },
          yieldGrams: Number,
          yieldUnits: Number,
        },
        { strict: false },
      ),
    );

  const Tray =
    (db.models['Tray'] as mongoose.Model<any> | undefined) ??
    db.model(
      'Tray',
      new Schema(
        {
          name: String,
          recipes: [
            new Schema(
              {
                recipeId: Schema.Types.ObjectId,
                quantity: Number,
              },
              { strict: false, _id: false },
            ),
          ],
          complements: [
            new Schema(
              {
                complementId: Schema.Types.ObjectId,
                quantity: Number,
              },
              { strict: false, _id: false },
            ),
          ],
        },
        { strict: false },
      ),
    );

  const Sale =
    (db.models['Sale'] as mongoose.Model<any> | undefined) ??
    db.model(
      'Sale',
      new Schema(
        {
          items: [
            new Schema(
              {
                itemType: String,
                recipeId: Schema.Types.ObjectId,
                trayId: Schema.Types.ObjectId,
                quantity: Number,
                costAtSale: Number,
                subtotalCost: Number,
              },
              { strict: false, _id: false },
            ),
          ],
          total: Number,
          totalCost: Number,
        },
        { strict: false },
      ),
    );

  return { Ingredient, Complement, Recipe, Tray, Sale };
}

/**
 * Compute `costBase` for a recipe = sum of (ingredients + sub-recipes),
 * excluding own complements. Mirrors `calculateRecipeCost` semantics.
 *
 * Uses memoization keyed by recipe id and a per-branch visited set to break
 * cycles (sub-recipe recipes referencing themselves). Depth-bounded at
 * MAX_SUB_RECIPE_DEPTH for safety.
 */
async function computeRecipeCostBase(
  recipeId: Types.ObjectId,
  models: TenantModels,
  memo: Map<string, number>,
  visited: Set<string>,
  depth: number,
): Promise<number> {
  if (depth > MAX_SUB_RECIPE_DEPTH) return 0;

  const key = recipeId.toString();
  if (memo.has(key)) return memo.get(key)!;
  if (visited.has(key)) return 0; // cycle guard

  visited.add(key);

  const recipe = await models.Recipe.findById(recipeId).lean();
  if (!recipe) {
    visited.delete(key);
    memo.set(key, 0);
    return 0;
  }

  let costBase = 0;

  for (const ing of (recipe as any).ingredients ?? []) {
    const itemType = ing.type ?? 'ingredient';
    if (itemType === 'subRecipe' && ing.recipeId) {
      const subCostBase = await computeRecipeCostBase(
        ing.recipeId,
        models,
        memo,
        visited,
        depth + 1,
      );
      const subRecipe = await models.Recipe.findById(ing.recipeId).lean();
      if (subRecipe) {
        const sellUnit = (subRecipe as any).sellUnit ?? 'unidad';
        const yieldGrams = (subRecipe as any).yieldGrams ?? 0;
        const yieldUnits = (subRecipe as any).yieldUnits ?? 1;
        if (sellUnit === 'kg' && yieldGrams > 0) {
          costBase += (subCostBase / yieldGrams) * ing.quantity;
        } else {
          costBase += (subCostBase / (yieldUnits || 1)) * ing.quantity;
        }
      }
    } else if (ing.ingredientId) {
      const ingredient = await models.Ingredient.findById(
        ing.ingredientId,
      ).lean();
      if (ingredient) {
        const unit = (ingredient as any).unit;
        if (unit === 'unidad') {
          costBase += ((ingredient as any).costPerUnit ?? 0) * ing.quantity;
        } else {
          // weight-based: costPerKg is per 1000g.
          costBase +=
            (((ingredient as any).costPerKg ?? 0) * ing.quantity) / 1000;
        }
      }
    }
  }

  // costBase EXCLUDES own complements — matches `calculateRecipeCost`.
  const result = roundCurrency(costBase);
  memo.set(key, result);
  visited.delete(key);
  return result;
}

/**
 * Compute total cost of a tray: sum(recipe.costBase × qty) + sum(own complements × qty).
 * Mirrors `calculateTrayCost` semantics.
 */
async function computeTrayCost(
  trayId: Types.ObjectId,
  models: TenantModels,
  recipeCostMemo: Map<string, number>,
): Promise<number> {
  const tray = await models.Tray.findById(trayId).lean();
  if (!tray) return 0;

  let cost = 0;

  for (const tr of (tray as any).recipes ?? []) {
    const subCostBase = await computeRecipeCostBase(
      tr.recipeId,
      models,
      recipeCostMemo,
      new Set(),
      0,
    );
    const subRecipe = await models.Recipe.findById(tr.recipeId).lean();
    if (subRecipe) {
      const sellUnit = (subRecipe as any).sellUnit ?? 'unidad';
      const yieldGrams = (subRecipe as any).yieldGrams ?? 0;
      const yieldUnits = (subRecipe as any).yieldUnits ?? 1;
      if (sellUnit === 'kg' && yieldGrams > 0) {
        cost += (subCostBase / yieldGrams) * tr.quantity;
      } else {
        cost += (subCostBase / (yieldUnits || 1)) * tr.quantity;
      }
    }
  }

  for (const c of (tray as any).complements ?? []) {
    const comp = await models.Complement.findById(c.complementId).lean();
    if (comp) {
      cost += ((comp as any).costPerUnit ?? 0) * c.quantity;
    }
  }

  return roundCurrency(cost);
}

async function backfillDb(dbName: string): Promise<void> {
  const db = mongoose.connection.useDb(dbName, { useCache: true });
  const models = getTenantModels(db);

  const recipeCostMemo = new Map<string, number>();
  let processed = 0;
  let updated = 0;

  const cursor = models.Sale.find({}).lean().cursor();

  for await (const sale of cursor) {
    const items = (sale as any).items ?? [];
    const updatedItems: any[] = [];
    let totalCost = 0;

    for (const item of items) {
      let costAtSale: number;

      // Note: idempotency was intentionally removed. An earlier revision of
      // this migration populated costAtSale without dividing by the recipe's
      // yield, producing negative profit. Re-running unconditionally overwrites
      // with the corrected per-unit calculation below.

      if (item.itemType === 'tray' && item.trayId) {
        const trayCost = await computeTrayCost(
          item.trayId,
          models,
          recipeCostMemo,
        );
        // computeTrayCost already returns the tray's TOTAL cost (sum across
        // its recipes × quantities + own complements), so costAtSale is the
        // cost per single tray unit here.
        costAtSale = trayCost;
      } else if (item.recipeId) {
        const costBase = await computeRecipeCostBase(
          item.recipeId,
          models,
          recipeCostMemo,
          new Set(),
          0,
        );
        // Mirror sales.service.ts: costBase is the TOTAL recipe cost; the
        // per-unit cost is costBase divided by yield. Without this, a sale of
        // 1 unit from a recipe that yields 10 charges 10x the real cost.
        const recipe = await models.Recipe.findById(item.recipeId).lean();
        const sellUnit = (recipe as any)?.sellUnit ?? 'unidad';
        const yieldGrams = (recipe as any)?.yieldGrams ?? 0;
        const yieldUnits = (recipe as any)?.yieldUnits ?? 1;
        costAtSale =
          sellUnit === 'kg' && yieldGrams > 0
            ? costBase / yieldGrams
            : costBase / (yieldUnits || 1);
      } else {
        costAtSale = 0;
      }

      const subtotalCost = roundCurrency(costAtSale * item.quantity);
      totalCost += subtotalCost;
      updatedItems.push({ ...item, costAtSale, subtotalCost });
    }

    const roundedTotalCost = roundCurrency(totalCost);
    const hasMissingCost =
      items.some(
        (i: any) => typeof i.costAtSale !== 'number',
      ) || (sale as any).totalCost !== roundedTotalCost;

    if (hasMissingCost) {
      await models.Sale.updateOne(
        { _id: sale._id },
        { $set: { items: updatedItems, totalCost: roundedTotalCost } },
      );
      updated++;
    }

    processed++;
    if (processed % 50 === 0) {
      console.log(
        `Migration backfill-sale-item-costs [${dbName}]: processed ${processed}, updated ${updated}`,
      );
    }
  }

  console.log(
    `Migration backfill-sale-item-costs [${dbName}]: finished — processed ${processed} sales, updated ${updated}`,
  );
}

/**
 * CLI entry point. Allows `pnpm --filter server backfill-costs` to run the
 * migration standalone: connect → run per tenant → disconnect.
 */
async function main(): Promise<void> {
  await connectDB();
  try {
    await runBackfillSaleItemCostsMigration();
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('backfill-costs failed:', err);
    process.exit(1);
  });
}
