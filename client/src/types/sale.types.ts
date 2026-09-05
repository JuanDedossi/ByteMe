export interface SaleItem {
  itemType?: 'recipe' | 'tray';
  recipeId?: string;
  trayId?: string;
  recipeName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Sale {
  _id: string;
  items: SaleItem[];
  total: number;
  createdAt: string;
}

export interface CreateSalePayload {
  items: { recipeId?: string; trayId?: string; quantity: number }[];
}

export interface SaleStats {
  weekly: number;
  monthly: number;
  weeklyProfit: number;
  monthlyProfit: number;
}

export interface SaleSummary {
  count: number;
  totalAmount: number;
  totalCost: number;
  profit: number;
}

export interface BreakdownItem {
  type: 'recipe' | 'tray';
  name: string;
  quantity: number;
  revenue: number;
  profit: number;
}

export interface BreakdownResponse {
  items: BreakdownItem[];
  total: number;
}
