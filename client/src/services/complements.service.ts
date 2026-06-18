import api from './api';
import type { Complement, CreateComplementPayload, UpdateComplementPayload } from '../types/complement.types';

export interface ComplementsListResponse {
  success: boolean;
  data: Complement[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ComplementsListParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

export const complementsService = {
  async list(params: ComplementsListParams = {}): Promise<ComplementsListResponse> {
    const { data } = await api.get('/complements', { params });
    return data;
  },

  async getById(id: string): Promise<Complement> {
    const { data } = await api.get(`/complements/${id}`);
    return data.data;
  },

  async create(payload: CreateComplementPayload): Promise<Complement> {
    const { data } = await api.post('/complements', payload);
    return data.data;
  },

  async update(id: string, payload: UpdateComplementPayload): Promise<Complement> {
    const { data } = await api.patch(`/complements/${id}`, payload);
    return data.data;
  },

  async toggleActive(id: string): Promise<Complement> {
    const { data } = await api.patch(`/complements/${id}/toggle-active`);
    return data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/complements/${id}`);
  },
};
