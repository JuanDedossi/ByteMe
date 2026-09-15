import api from './api';
import type {
  Recipe,
  CreateRecipePayload,
  UpdateRecipePayload,
  UpdatePreparationPayload,
} from '../types/recipe.types';

export interface RecipesListResponse {
  success: boolean;
  data: Recipe[];
  total: number;
  page: number;
  totalPages: number;
}

export const recipesService = {
  async list(params: { page?: number; limit?: number; search?: string; isSubRecipe?: boolean; sortByStock?: boolean; hasStock?: boolean } = {}): Promise<RecipesListResponse> {
    const { data } = await api.get('/recipes', { params });
    return data;
  },

  async getById(id: string): Promise<Recipe> {
    const { data } = await api.get(`/recipes/${id}`);
    return data.data;
  },

  async create(payload: CreateRecipePayload): Promise<Recipe> {
    const { data } = await api.post('/recipes', payload);
    return data.data;
  },

  async update(id: string, payload: UpdateRecipePayload): Promise<Recipe> {
    const { data } = await api.patch(`/recipes/${id}`, payload);
    return data.data;
  },

  async updateStock(id: string, stock: number): Promise<Recipe> {
    const { data } = await api.patch(`/recipes/${id}/stock`, { stock });
    return data.data;
  },

  async toggleActive(id: string): Promise<Recipe> {
    const { data } = await api.patch(`/recipes/${id}/toggle-active`);
    return data.data;
  },

  async updatePrice(id: string, customSellingPrice: number | null): Promise<Recipe> {
    const { data } = await api.patch(`/recipes/${id}/price`, { customSellingPrice });
    return data.data;
  },

  async updatePreparation(
    id: string,
    payload: UpdatePreparationPayload,
  ): Promise<Recipe> {
    const { data } = await api.patch(`/recipes/${id}/preparation`, payload);
    return data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/recipes/${id}`);
  },
};
