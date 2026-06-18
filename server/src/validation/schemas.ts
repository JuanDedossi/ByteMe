import { z } from 'zod';

const IngredientItemSchema = z.object({
  ingredientId: z.string(),
  quantity: z.number().nonnegative(),
});

const SubRecipeItemSchema = z.object({
  recipeId: z.string(),
  quantity: z.number().nonnegative(),
});

// REQ-CMP-7: unit-aware validation lives in the service layer (see
// `validateComplementQuantities` in `services/complements.service.ts`) because
// Zod schemas are pure and need the referenced complement document to know its
// `unit`. This schema enforces only the absolute floor: `quantity > 0`. Both
// unidades and metros must have a positive quantity; the unit-specific minimum
// (>= 1 for unidad, > 0 for metro) is checked in the service after fetching
// the referenced complement.
const ComplementEntrySchema = z.object({
  complementId: z.string(),
  quantity: z.number().positive('Complement quantity must be greater than 0'),
});

export const CreateComplementSchema = z.object({
  name: z.string().min(1),
  unit: z.enum(['unidad', 'metro']).default('unidad'),
  costPerUnit: z.number().nonnegative(),
});

export type CreateComplementInput = z.infer<typeof CreateComplementSchema>;

export const UpdateComplementSchema = z
  .object({
    name: z.string().min(1).optional(),
    unit: z.enum(['unidad', 'metro']).optional(),
    costPerUnit: z.number().nonnegative().optional(),
  });

export type UpdateComplementInput = z.infer<typeof UpdateComplementSchema>;

export const CreateRecipeSchema = z
  .object({
    name: z.string().min(1),
    ingredients: z.array(IngredientItemSchema).default([]),
    subRecipes: z.array(SubRecipeItemSchema).optional(),
    complements: z.array(ComplementEntrySchema).optional(),
    profitRuleId: z.string(),
    sellUnit: z.enum(['unidad', 'kg']).optional(),
    yieldGrams: z.number().optional(),
    yieldUnits: z.number().optional(),
    isSubRecipe: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.sellUnit !== 'kg' ||
      (data.yieldGrams !== undefined && data.yieldGrams > 0),
    {
      message: 'yieldGrams must be > 0 when sellUnit is kg',
      path: ['yieldGrams'],
    },
  );

export type CreateRecipeInput = z.infer<typeof CreateRecipeSchema>;

export const UpdateRecipeSchema = z
  .object({
    name: z.string().min(1).optional(),
    ingredients: z.array(IngredientItemSchema).optional(),
    subRecipes: z.array(SubRecipeItemSchema).optional(),
    complements: z.array(ComplementEntrySchema).optional(),
    profitRuleId: z.string().optional(),
    sellUnit: z.enum(['unidad', 'kg']).optional(),
    yieldGrams: z.number().optional(),
    yieldUnits: z.number().optional(),
    isSubRecipe: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.sellUnit !== 'kg' ||
      (data.yieldGrams !== undefined && data.yieldGrams > 0),
    {
      message: 'yieldGrams must be > 0 when sellUnit is kg',
      path: ['yieldGrams'],
    },
  );

export type UpdateRecipeInput = z.infer<typeof UpdateRecipeSchema>;

export const UpdateStockSchema = z.object({
  stock: z.number().int().min(0),
});

export type UpdateStockInput = z.infer<typeof UpdateStockSchema>;

export const UpdateRecipePriceSchema = z.object({
  customSellingPrice: z.number().nullable(),
});

export type UpdateRecipePriceInput = z.infer<typeof UpdateRecipePriceSchema>;

export const CreateTraySchema = z.object({
  name: z.string().min(1),
  recipes: z.array(
    z.object({
      recipeId: z.string(),
      quantity: z.number().nonnegative(),
    }),
  ).min(1),
  complements: z.array(ComplementEntrySchema).optional(),
  profitRuleId: z.string(),
});

export type CreateTrayInput = z.infer<typeof CreateTraySchema>;

export const UpdateTraySchema = z
  .object({
    name: z.string().min(1).optional(),
    recipes: z
      .array(
        z.object({
          recipeId: z.string(),
          quantity: z.number().nonnegative(),
        }),
      )
      .optional(),
    complements: z.array(ComplementEntrySchema).optional(),
    profitRuleId: z.string().optional(),
  })
  .refine(
    (data) => data.recipes === undefined || data.recipes.length > 0,
    {
      message: 'tray must have at least one recipe',
      path: ['recipes'],
    },
  );

export type UpdateTrayInput = z.infer<typeof UpdateTraySchema>;

export const UpdateTrayPriceSchema = z.object({
  customSellingPrice: z.number().nullable(),
});

export type UpdateTrayPriceInput = z.infer<typeof UpdateTrayPriceSchema>;

export const RegisterPurchaseSchema = z.object({
  ingredientName: z.string().min(1),
  isNew: z.boolean().optional(),
  ingredientId: z.string().optional(),
  unit: z.enum(['kg', 'unidad']).optional(),
  quantityPurchased: z.number().positive(),
  pricePaid: z.number().nonnegative(),
});

export type RegisterPurchaseInput = z.infer<typeof RegisterPurchaseSchema>;

export const UpdateIngredientSchema = z.object({
  name: z.string().min(1).optional(),
  unit: z.enum(['kg', 'unidad']).optional(),
  costPerKg: z.number().nonnegative().optional(),
  costPerUnit: z.number().nonnegative().optional(),
});

export type UpdateIngredientInput = z.infer<typeof UpdateIngredientSchema>;

const SaleItemSchema = z
  .object({
    recipeId: z.string().optional(),
    trayId: z.string().optional(),
    quantity: z.number().positive(),
  })
  .refine(
    (data) =>
      (data.recipeId && !data.trayId) ||
      (!data.recipeId && data.trayId),
    {
      message: 'item must reference either a recipe or a tray, not both',
    },
  );

export const CreateSaleSchema = z.object({
  items: z.array(SaleItemSchema).min(1),
});

export type CreateSaleInput = z.infer<typeof CreateSaleSchema>;

export const CreateProfitRuleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  markupPercentage: z.number().min(0, 'markupPercentage must be >= 0'),
});

export type CreateProfitRuleInput = z.infer<typeof CreateProfitRuleSchema>;

export const UpdateProfitRuleSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  markupPercentage: z.number().min(0, 'markupPercentage must be >= 0').optional(),
});

export type UpdateProfitRuleInput = z.infer<typeof UpdateProfitRuleSchema>;
