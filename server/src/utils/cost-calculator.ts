import { roundCurrency } from './currency';
import type { RecipeDocument } from '../models/recipe.model';
import type { IngredientDocument } from '../models/ingredient.model';
import type { ComplementDocument } from '../models/complement.model';
import type { TrayDocument } from '../models/tray.model';

// Re-used here so the cost calculator owns the depth limit
// (also referenced from the recipes service for recursion control).
export const MAX_SUB_RECIPE_DEPTH = 10;

export interface RecipeCostSummary {
  costBase: number;
  costTotal: number;
}

export interface SubRecipeCostContext {
  costBase: number;
  sellUnit: string;
  yieldGrams: number;
  yieldUnits: number;
}

/**
 * Compute the contribution of an ingredient at a given quantity, in the
 * recipe's currency unit. Returns 0 when the ingredient reference is unknown
 * (e.g. the parent recipe was saved with a stale id).
 */
export function calculateIngredientCost(
  ing: IngredientDocument | undefined,
  quantity: number,
): number {
  if (!ing) return 0;
  if (ing.unit === 'unidad') {
    return ing.costPerUnit * quantity;
  }
  // Weight-based ingredient: costPerKg represents price per 1000g.
  return (ing.costPerKg * quantity) / 1000;
}

/**
 * Cost contribution of a sub-recipe at the requested quantity.
 * Always uses the sub-recipe's `costBase` (NOT costTotal) — complements
 * do NOT propagate upward.
 */
export function calculateSubRecipeCostContribution(
  sub: SubRecipeCostContext | undefined,
  quantity: number,
): number {
  if (!sub) return 0;
  if (sub.sellUnit === 'kg' && sub.yieldGrams > 0) {
    return (sub.costBase / sub.yieldGrams) * quantity;
  }
  return (sub.costBase / (sub.yieldUnits || 1)) * quantity;
}

/**
 * Cost contribution of a single complement entry. Inactive complements
 * still contribute (the inactive flag only gates selection lists, not cost).
 */
export function calculateComplementCost(
  comp: ComplementDocument | undefined,
  quantity: number,
): number {
  if (!comp) return 0;
  return comp.costPerUnit * quantity;
}

/**
 * Calculate `costBase` and `costTotal` for a recipe given the
 * already-resolved lookup maps. Sub-recipe cost propagation uses the
 * sub-recipe's `costBase` only; own complements add to `costTotal`.
 */
export function calculateRecipeCost(
  recipe: RecipeDocument,
  ingredientMap: Map<string, IngredientDocument>,
  subRecipeMap: Map<string, SubRecipeCostContext>,
  complementMap: Map<string, ComplementDocument>,
): RecipeCostSummary {
  let costBase = 0;

  for (const item of recipe.ingredients) {
    const itemType = (item as any).type ?? 'ingredient';
    if (itemType === 'subRecipe') {
      const subId = (item as any).recipeId?.toString() ?? '';
      const sub = subRecipeMap.get(subId);
      costBase += calculateSubRecipeCostContribution(sub, item.quantity);
    } else {
      const ingId = item.ingredientId?.toString() ?? '';
      const ing = ingredientMap.get(ingId);
      costBase += calculateIngredientCost(ing, item.quantity);
    }
  }

  let complementCost = 0;
  for (const c of recipe.complements ?? []) {
    const comp = complementMap.get(c.complementId.toString());
    complementCost += calculateComplementCost(comp, c.quantity);
  }

  return {
    costBase: roundCurrency(costBase),
    costTotal: roundCurrency(costBase + complementCost),
  };
}

/**
 * Calculate total cost of a tray:
 *   cost = sum(recipe.costBase × qty) + sum(tray.complements × qty)
 * Always uses recipe.costBase (not costTotal) so complement costs of
 * sub-recipes do not double-count.
 */
export function calculateTrayCost(
  tray: TrayDocument,
  recipeMap: Map<string, SubRecipeCostContext>,
  complementMap: Map<string, ComplementDocument>,
): number {
  let cost = 0;

  for (const tr of tray.recipes) {
    const recipe = recipeMap.get(tr.recipeId.toString());
    if (recipe) {
      if (recipe.sellUnit === 'kg' && recipe.yieldGrams > 0) {
        cost += (recipe.costBase / recipe.yieldGrams) * tr.quantity;
      } else {
        cost += (recipe.costBase / (recipe.yieldUnits || 1)) * tr.quantity;
      }
    }
  }

  for (const c of tray.complements ?? []) {
    const comp = complementMap.get(c.complementId.toString());
    cost += calculateComplementCost(comp, c.quantity);
  }

  return roundCurrency(cost);
}
