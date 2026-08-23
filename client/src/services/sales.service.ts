import api from './api';
import type { Sale, CreateSalePayload, SaleStats, SaleSummary } from '../types/sale.types';

export interface SalesListResponse {
  success: boolean;
  data: Sale[];
  total: number;
  page: number;
  totalPages: number;
}

export const salesService = {
  async list(params: { page?: number; limit?: number; dateFrom?: string; dateTo?: string } = {}): Promise<SalesListResponse> {
    const { data } = await api.get('/sales', { params });
    return data;
  },

  async getStats(): Promise<SaleStats> {
    const { data } = await api.get('/sales/stats');
    return data.data as SaleStats;
  },

  async getSummary(params: { dateFrom?: string; dateTo?: string } = {}): Promise<SaleSummary> {
    const { data } = await api.get('/sales/summary', { params });
    return data.data as SaleSummary;
  },

  async create(payload: CreateSalePayload): Promise<Sale> {
    const { data } = await api.post('/sales', payload);
    return data.data as Sale;
  },
};
