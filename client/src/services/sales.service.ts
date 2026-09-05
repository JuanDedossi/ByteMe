import api from './api';
import type { BreakdownResponse, Sale, CreateSalePayload, SaleSummary } from '../types/sale.types';

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

  async getSummary(params: { dateFrom?: string; dateTo?: string } = {}): Promise<SaleSummary> {
    const { data } = await api.get('/sales/summary', { params });
    return data.data as SaleSummary;
  },

  async getBreakdown(params: {
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<BreakdownResponse> {
    const { data } = await api.get('/sales/breakdown', { params });
    return data.data as BreakdownResponse;
  },

  async create(payload: CreateSalePayload): Promise<Sale> {
    const { data } = await api.post('/sales', payload);
    return data.data as Sale;
  },
};
