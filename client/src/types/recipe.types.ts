export interface RecipeIngredient {
  ingredientId: string;
  ingredientName: string;
  ingredientUnit: string;
  quantity: number;
  cost: number;
  isSubRecipe?: boolean;
}

export interface RecipeComplement {
  complementId: string;
  complementName?: string;
  complementUnit?: string;
  quantity: number;
  cost?: number;
}

export interface PreparationStep {
  order: number;
  text: string;
  ingredientItems: { ingredientId: string; quantity: number }[];
}

export interface Preparation {
  steps: PreparationStep[];
  videoUrl?: string;
}

export interface Recipe {
  _id: string;
  name: string;
  ingredients: RecipeIngredient[];
  complements?: RecipeComplement[];
  cost: number;
  costBase: number;
  costTotal: number;
  profitRuleId: string;
  profitRuleName: string;
  markupPercentage: number;
  sellingPrice: number;
  customSellingPrice: number | null;
  sellUnit: string;
  yieldGrams: number;
  yieldUnits: number;
  pricePerKg: number;
  pricePer100g: number;
  stock: number;
  isActive: boolean;
  isSubRecipe: boolean;
  createdAt: string;
  updatedAt: string;
  preparation?: Preparation;
}

export interface CreateRecipePayload {
  name: string;
  ingredients: { ingredientId: string; quantity: number }[];
  subRecipes?: { recipeId: string; quantity: number }[];
  complements?: { complementId: string; quantity: number }[];
  profitRuleId: string;
  sellUnit?: string;
  yieldGrams?: number;
  yieldUnits?: number;
  isSubRecipe?: boolean;
}

export interface UpdateRecipePayload {
  name?: string;
  ingredients?: { ingredientId: string; quantity: number }[];
  subRecipes?: { recipeId: string; quantity: number }[];
  complements?: { complementId: string; quantity: number }[];
  profitRuleId?: string;
  sellUnit?: string;
  yieldGrams?: number;
  yieldUnits?: number;
  isSubRecipe?: boolean;
}

export type UpdatePreparationPayload = Partial<Preparation>;
