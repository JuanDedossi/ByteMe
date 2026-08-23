import { useState, useEffect, useCallback } from 'react';
import { MdAdd } from 'react-icons/md';
import { RecipeStockCard } from '../components/stock/RecipeStockCard';
import { TrayStockCard } from '../components/stock/TrayStockCard';
import { ProfitMetrics } from '../components/stock/ProfitMetrics';
import { SaleModal } from '../components/sales/SaleModal';
import { SearchBar } from '../components/common/SearchBar';
import { Pagination } from '../components/common/Pagination';
import { recipesService } from '../services/recipes.service';
import { traysService } from '../services/trays.service';
import { salesService } from '../services/sales.service';
import type { Recipe } from '../types/recipe.types';
import type { Tray } from '../types/tray.types';
import type { SaleStats, CreateSalePayload } from '../types/sale.types';

export function StockSalesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [recipesTotal, setRecipesTotal] = useState(0);
  const [recipesPage, setRecipesPage] = useState(1);
  const [recipesTotalPages, setRecipesTotalPages] = useState(1);

  const [trays, setTrays] = useState<Tray[]>([]);
  const [traysTotal, setTraysTotal] = useState(0);
  const [traysPage, setTraysPage] = useState(1);
  const [traysTotalPages, setTraysTotalPages] = useState(1);

  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SaleStats>({ weekly: 0, monthly: 0, weeklyProfit: 0, monthlyProfit: 0 });
  const [modalOpen, setModalOpen] = useState(false);
  const [preSelectedId, setPreSelectedId] = useState<string | undefined>(undefined);
  const [preSelectedType, setPreSelectedType] = useState<'recipe' | 'tray' | undefined>(undefined);

  const limit = 10;

  const fetchRecipes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await recipesService.list({
        page: recipesPage,
        limit,
        search: search || undefined,
        sortByStock: true,
      });
      setRecipes(res.data);
      setRecipesTotal(res.total);
      setRecipesTotalPages(res.totalPages);
    } finally {
      setLoading(false);
    }
  }, [recipesPage, search]);

  const fetchTrays = useCallback(async () => {
    try {
      const res = await traysService.list({
        page: traysPage,
        limit,
        search: search || undefined,
        sortByStock: true,
      });
      setTrays(res.data);
      setTraysTotal(res.total);
      setTraysTotalPages(res.totalPages);
    } catch {
      // silently fail if trays endpoint not ready
    }
  }, [traysPage, search]);

  const fetchStats = useCallback(async () => {
    const data = await salesService.getStats();
    setStats(data);
  }, []);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchRecipes();
      void fetchTrays();
    }, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchRecipes, fetchTrays, search]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setRecipesPage(1);
    setTraysPage(1);
  };

  const handleRecipeStockChange = async (id: string, stock: number) => {
    const updated = await recipesService.updateStock(id, stock);
    setRecipes((prev) => prev.map((r) => (r._id === id ? updated : r)));
  };

  const handleTrayStockChange = async (id: string, stock: number) => {
    const updated = await traysService.updateStock(id, stock);
    setTrays((prev) => prev.map((t) => (t._id === id ? updated : t)));
  };

  const openSaleModal = (item?: Recipe | Tray, type?: 'recipe' | 'tray') => {
    setPreSelectedId(item?._id);
    setPreSelectedType(type);
    setModalOpen(true);
  };

  const handleSaleSubmit = async (payload: CreateSalePayload) => {
    await salesService.create(payload);
    await Promise.all([fetchRecipes(), fetchTrays(), fetchStats()]);
  };

  return (
    <div style={{ paddingBottom: '150px' }}>
      {/* Header */}
      <div
        style={{
          background: 'var(--color-secondary)',
          padding: 'var(--space-xl) var(--space-lg) var(--space-lg)',
          paddingTop: 'calc(var(--space-xl) + env(safe-area-inset-top))',
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-headline)',
            fontSize: '1.75rem',
            color: 'var(--color-on-primary)',
            margin: '0 0 var(--space-md)',
          }}
        >
          Stock y Ventas
        </h1>
        <SearchBar value={search} onChange={handleSearch} placeholder="Buscar receta o bandeja..." />
      </div>

      {/* Content */}
      <div style={{ padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
        {/* Profit metrics */}
        <ProfitMetrics stats={stats} />

        {/* Recipes section */}
        {!loading && (
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.8rem',
              color: 'var(--color-text-secondary)',
              margin: 0,
            }}
          >
            {recipesTotal} {recipesTotal === 1 ? 'receta' : 'recetas'}
            {search && ` para "${search}"`}
          </p>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-2xl)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>
            Cargando...
          </div>
        ) : recipes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>
            {search
              ? `No se encontraron recetas para "${search}"`
              : 'No hay recetas disponibles.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {recipes.map((recipe) => (
              <RecipeStockCard
                key={recipe._id}
                recipe={recipe}
                onStockChange={handleRecipeStockChange}
                onSell={(r) => openSaleModal(r, 'recipe')}
              />
            ))}
          </div>
        )}

        <Pagination page={recipesPage} totalPages={recipesTotalPages} onPageChange={setRecipesPage} />

        {/* Trays section */}
        {(traysTotal > 0 || search) && (
          <>
            <div
              style={{
                borderTop: '1px solid rgba(218, 193, 184, 0.3)',
                paddingTop: 'var(--space-md)',
              }}
            >
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.8rem',
                  color: 'var(--color-text-secondary)',
                  margin: 0,
                }}
              >
                {traysTotal} {traysTotal === 1 ? 'bandeja' : 'bandejas'}
                {search && ` para "${search}"`}
              </p>
            </div>

            {trays.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-lg)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>
                {search
                  ? `No se encontraron bandejas para "${search}"`
                  : 'No hay bandejas disponibles.'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                {trays.map((tray) => (
                  <TrayStockCard
                    key={tray._id}
                    tray={tray}
                    onStockChange={handleTrayStockChange}
                    onSell={(t) => openSaleModal(t, 'tray')}
                  />
                ))}
              </div>
            )}

            {traysTotalPages > 1 && (
              <Pagination page={traysPage} totalPages={traysTotalPages} onPageChange={setTraysPage} />
            )}
          </>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => openSaleModal()}
        style={{
          position: 'fixed',
          bottom: 'calc(72px + var(--space-lg))',
          right: 'var(--space-lg)',
          background: 'var(--color-primary)',
          color: 'var(--color-on-primary)',
          border: 'none',
          borderRadius: 'var(--radius-full)',
          padding: 'var(--space-md) var(--space-lg)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-sm)',
          boxShadow: '0 4px 16px rgba(188, 108, 37, 0.4)',
          cursor: 'pointer',
          fontFamily: 'var(--font-body)',
          fontSize: '0.9rem',
          fontWeight: 600,
          zIndex: 50,
        }}
      >
        <MdAdd size={20} />
        Nueva Venta
      </button>

      <SaleModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSaleSubmit}
        preSelectedId={preSelectedId}
        preSelectedType={preSelectedType}
      />
    </div>
  );
}
