import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MdArrowBack } from 'react-icons/md';
import { recipesService } from '../services/recipes.service';
import type { Recipe } from '../types/recipe.types';
import { PreparationTab } from '../components/recipes/PreparationTab';

/**
 * Recipe detail page — single-purpose view: the preparation.
 *
 * Replaces the earlier three-tab layout (Ingredientes / Preparación /
 * Costos). The reference data (ingredients, complements, costs)
 * lives in the RecipeCard expand on the list page, so the detail page
 * is now a focused action surface for cooking: header + back button,
 * then the prep steps + video link.
 *
 * `?tab=preparacion` deep links still work — the param is silently
 * ignored when there is only one tab, so old URLs from share targets
 * don't break.
 */
export function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          <PreparationTab recipe={recipe} onUpdated={handleUpdated} />
        )}
      </div>
    </div>
  );
}
