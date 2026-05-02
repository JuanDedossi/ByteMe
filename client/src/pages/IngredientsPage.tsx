import { useState, useEffect, useCallback } from 'react';
import { MdAddShoppingCart } from 'react-icons/md';
import { IngredientCard } from '../components/ingredients/IngredientCard';
import { PurchaseModal } from '../components/ingredients/PurchaseModal';
import { IngredientFormModal } from '../components/ingredients/IngredientFormModal';
import { SearchBar } from '../components/common/SearchBar';
import { Pagination } from '../components/common/Pagination';
import { ingredientsService } from '../services/ingredients.service';
import type { Ingredient, RegisterPurchasePayload } from '../types/ingredient.types';

export function IngredientsPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]);

  const limit = 10;

  const fetchIngredients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ingredientsService.list({ page, limit, search: search || undefined });
      setIngredients(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  const fetchAllIngredients = useCallback(async () => {
    const res = await ingredientsService.list({ limit: 9999 });
    setAllIngredients(res.data);
  }, []);

  useEffect(() => {
    fetchAllIngredients();
  }, [fetchAllIngredients]);

  useEffect(() => {
    const timer = setTimeout(fetchIngredients, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchIngredients, search]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleEditSubmit = async (payload: any) => {
    if (!editingIngredient) return;
    await ingredientsService.update(editingIngredient._id, payload);
    setEditingIngredient(null);
    fetchIngredients();
    fetchAllIngredients();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar este ingrediente?')) return;
    await ingredientsService.delete(id);
    fetchIngredients();
  };

  const handlePurchase = async (payload: RegisterPurchasePayload) => {
    await ingredientsService.registerPurchase(payload);
    setPage(1);
    setSearch('');
    await Promise.all([fetchIngredients(), fetchAllIngredients()]);
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
          Ingredientes
        </h1>
        <SearchBar
          value={search}
          onChange={handleSearch}
          placeholder="Buscar ingrediente..."
        />
      </div>

      {/* Content */}
      <div style={{ padding: 'var(--space-lg)' }}>
        {/* Count */}
        {!loading && (
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.8rem',
              color: 'var(--color-text-secondary)',
              margin: '0 0 var(--space-md)',
            }}
          >
            {total} {total === 1 ? 'ingrediente' : 'ingredientes'}
            {search && ` para "${search}"`}
          </p>
        )}

        {/* List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-2xl)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>
            Cargando...
          </div>
        ) : ingredients.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: 'var(--space-2xl)',
              color: 'var(--color-text-secondary)',
              fontFamily: 'var(--font-body)',
            }}
          >
            {search
              ? `No se encontraron ingredientes para "${search}"`
              : 'Aún no hay ingredientes. Registrá tu primera compra.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {ingredients.map((ingredient) => (
              <IngredientCard
                key={ingredient._id}
                ingredient={ingredient}
                onEditRequest={setEditingIngredient}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {/* FAB */}
      <button
        onClick={() => setModalOpen(true)}
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
        <MdAddShoppingCart size={20} />
        Registrar Compra
      </button>

      <PurchaseModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handlePurchase}
        existingIngredients={allIngredients}
      />

      <IngredientFormModal
        isOpen={!!editingIngredient}
        onClose={() => setEditingIngredient(null)}
        initialData={editingIngredient}
        onSubmit={handleEditSubmit}
      />
    </div>
  );
}
