import { useState, useEffect, useCallback } from 'react';
import { MdAdd } from 'react-icons/md';
import { TrayCard } from '../components/trays/TrayCard';
import { TrayFormModal } from '../components/trays/TrayFormModal';
import { SearchBar } from '../components/common/SearchBar';
import { Pagination } from '../components/common/Pagination';
import { traysService } from '../services/trays.service';
import { recipesService } from '../services/recipes.service';
import { profitRulesService } from '../services/profit-rules.service';
import { complementsService } from '../services/complements.service';
import type {
  Tray,
  CreateTrayPayload,
  UpdateTrayPayload,
} from '../types/tray.types';
import type { Recipe } from '../types/recipe.types';
import type { ProfitRule } from '../types/profit-rule.types';
import type { Complement } from '../types/complement.types';

export function TraysPage() {
  const [trays, setTrays] = useState<Tray[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTray, setEditingTray] = useState<Tray | null>(null);

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [profitRules, setProfitRules] = useState<ProfitRule[]>([]);
  // Includes inactive complements so the form can render them with the
  // "Inactivo" badge (P1).
  const [complements, setComplements] = useState<Complement[]>([]);

  const limit = 10;

  const fetchTrays = useCallback(async () => {
    setLoading(true);
    try {
      const res = await traysService.list({
        page,
        limit,
        search: search || undefined,
      });
      setTrays(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    Promise.all([
      recipesService.list({ limit: 200 }),
      profitRulesService.list(),
      complementsService.list({ limit: 200 }),
    ]).then(([recipesRes, rules, compRes]) => {
      setRecipes(recipesRes.data);
      setProfitRules(rules);
      setComplements(compRes.data);
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(fetchTrays, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchTrays, search]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleCreate = async (payload: CreateTrayPayload) => {
    await traysService.create(payload);
    setPage(1);
    setSearch('');
    await fetchTrays();
  };

  const handleEditSubmit = async (payload: UpdateTrayPayload) => {
    if (!editingTray) return;
    const updated = await traysService.update(editingTray._id, payload);
    setTrays((prev) =>
      prev.map((t) => (t._id === editingTray._id ? updated : t)),
    );
    setEditingTray(null);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar esta bandeja?')) return;
    await traysService.delete(id);
    await fetchTrays();
  };

  const handleUpdatePrice = async (id: string, price: number | null) => {
    const updated = await traysService.updatePrice(id, price);
    setTrays((prev) => prev.map((t) => (t._id === id ? updated : t)));
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
          Bandejas
        </h1>
        <SearchBar
          value={search}
          onChange={handleSearch}
          placeholder="Buscar bandeja..."
        />
      </div>

      {/* Content */}
      <div style={{ padding: 'var(--space-lg)' }}>
        {!loading && (
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.8rem',
              color: 'var(--color-text-secondary)',
              margin: '0 0 var(--space-md)',
            }}
          >
            {total} {total === 1 ? 'bandeja' : 'bandejas'}
            {search && ` para "${search}"`}
          </p>
        )}

        {loading ? (
          <div
            style={{
              textAlign: 'center',
              padding: 'var(--space-2xl)',
              color: 'var(--color-text-secondary)',
              fontFamily: 'var(--font-body)',
            }}
          >
            Cargando...
          </div>
        ) : trays.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: 'var(--space-2xl)',
              color: 'var(--color-text-secondary)',
              fontFamily: 'var(--font-body)',
            }}
          >
            {search
              ? `No se encontraron bandejas para "${search}"`
              : 'Aún no hay bandejas. Creá la primera con el botón de abajo.'}
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-sm)',
            }}
          >
            {trays.map((tray) => (
              <TrayCard
                key={tray._id}
                tray={tray}
                onEditRequest={setEditingTray}
                onDelete={handleDelete}
                onUpdatePrice={handleUpdatePrice}
              />
            ))}
          </div>
        )}

        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
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
        <MdAdd size={20} />
        Nueva Bandeja
      </button>

      <TrayFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreate}
        recipes={recipes}
        profitRules={profitRules}
        complements={complements}
      />

      <TrayFormModal
        isOpen={!!editingTray}
        onClose={() => setEditingTray(null)}
        onSubmit={handleEditSubmit}
        initialData={editingTray}
        recipes={recipes}
        profitRules={profitRules}
        complements={complements}
      />
    </div>
  );
}
