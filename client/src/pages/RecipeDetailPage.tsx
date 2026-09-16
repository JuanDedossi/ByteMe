import { useCallback, useEffect, useState } from 'react';
import {
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { MdArrowBack } from 'react-icons/md';
import { recipesService } from '../services/recipes.service';
import type { Recipe } from '../types/recipe.types';
import { IngredientesTab } from '../components/recipes/IngredientesTab';
import { PreparationTab } from '../components/recipes/PreparationTab';

type TabKey = 'ingredientes' | 'preparacion';

const TAB_ORDER: TabKey[] = ['ingredientes', 'preparacion'];
const TAB_LABELS: Record<TabKey, string> = {
  ingredientes: 'Ingredientes',
  preparacion: 'Preparación',
};

const VALID_TABS: ReadonlySet<TabKey> = new Set(TAB_ORDER);

function parseTabParam(raw: string | null): TabKey {
  return raw && VALID_TABS.has(raw as TabKey) ? (raw as TabKey) : 'preparacion';
}

/**
 * Recipe detail page introduced by the recipe-preparation feature.
 * Replaces the legacy expand-on-card UX with a dedicated screen hosting
 * two tabs (Ingredientes / Preparación). Mobile-first with safe-area
 * padding for the BottomNav.
 *
 * The Costos tab that existed in PR 3 was removed: the price is already
 * visible on RecipeCard and the cost breakdown overlaps conceptually
 * with the Ingredientes tab. If we ever need it back, drop the
 * CostosTab import and add 'costos' to TabKey + TAB_ORDER.
 *
 * The active tab is driven by the `?tab=` query param so deep links
 * (e.g. `/recetas/:id?tab=preparacion`) land directly on the right tab.
 */
export function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeTab = parseTabParam(searchParams.get('tab'));
  const setActiveTab = useCallback(
    (key: TabKey) => {
      setSearchParams({ tab: key }, { replace: true });
    },
    [setSearchParams],
  );

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    recipesService
      .getById(id)
      .then((data) => {
        if (!cancelled) setRecipe(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err && typeof err === 'object' && 'message' in err
              ? String((err as { message: unknown }).message)
              : 'No se pudo cargar la receta',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleUpdated = useCallback((updated: Recipe) => {
    setRecipe(updated);
  }, []);

  return (
    <div style={{ paddingBottom: '150px' }}>
      <div
        style={{
          background: 'var(--color-secondary)',
          padding: 'var(--space-xl) var(--space-lg) var(--space-lg)',
          paddingTop: 'calc(var(--space-xl) + env(safe-area-inset-top))',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-sm)',
        }}
      >
        <button
          onClick={() => navigate('/recetas')}
          aria-label="Volver a recetas"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--color-on-primary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            padding: 'var(--space-xs)',
          }}
        >
          <MdArrowBack size={22} />
        </button>
        <h1
          style={{
            fontFamily: 'var(--font-headline)',
            fontSize: '1.5rem',
            color: 'var(--color-on-primary)',
            margin: 0,
            flex: 1,
          }}
        >
          {recipe?.name ?? (loading ? 'Cargando...' : 'Receta')}
        </h1>
      </div>

      {/* Segmented tab control */}
      <div
        role="tablist"
        aria-label="Secciones de la receta"
        style={{
          display: 'flex',
          gap: 'var(--space-xs)',
          padding: 'var(--space-md) var(--space-lg)',
          background: 'var(--color-surface)',
          borderBottom: '1px solid rgba(218, 193, 184, 0.3)',
        }}
      >
        {TAB_ORDER.map((key) => (
          <button
            key={key}
            role="tab"
            aria-selected={activeTab === key}
            onClick={() => setActiveTab(key)}
            style={{
              flex: 1,
              fontFamily: 'var(--font-body)',
              fontSize: '0.8rem',
              fontWeight: activeTab === key ? 700 : 500,
              background:
                activeTab === key
                  ? 'var(--color-primary)'
                  : 'transparent',
              color:
                activeTab === key
                  ? 'var(--color-on-primary)'
                  : 'var(--color-text-secondary)',
              border: 'none',
              borderRadius: 'var(--radius-full)',
              padding: 'var(--space-xs) var(--space-sm)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {TAB_LABELS[key]}
          </button>
        ))}
      </div>

      <div style={{ padding: 'var(--space-lg)' }}>
        {error && (
          <p
            style={{
              fontFamily: 'var(--font-body)',
              color: 'var(--color-error)',
              fontSize: '0.9rem',
            }}
          >
            {error}
          </p>
        )}
        {loading && !recipe && !error && (
          <p
            style={{
              fontFamily: 'var(--font-body)',
              color: 'var(--color-text-secondary)',
              fontSize: '0.85rem',
              textAlign: 'center',
              padding: 'var(--space-2xl)',
            }}
          >
            Cargando receta...
          </p>
        )}
        {recipe && !error && (
          <div role="tabpanel">
            {activeTab === 'ingredientes' && <IngredientesTab recipe={recipe} />}
            {activeTab === 'preparacion' && (
              <PreparationTab recipe={recipe} onUpdated={handleUpdated} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
