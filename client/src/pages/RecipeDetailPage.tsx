import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MdArrowBack } from 'react-icons/md';
import { recipesService } from '../services/recipes.service';
import type { Recipe } from '../types/recipe.types';

/**
 * Stub for the recipe detail page introduced by the recipe-preparation feature.
 * PR 3 replaces this stub with the full tabbed implementation (Ingredientes /
 * Preparación / Costos). For now it renders a basic header with the recipe
 * name and a back link so the /recetas/:id route is exercised end-to-end and
 * the typecheck stays green.
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

  return (
    <div
      style={{
        paddingBottom: '150px',
      }}
    >
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
        {!loading && !error && recipe && (
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.85rem',
              color: 'var(--color-text-secondary)',
            }}
          >
            Vista detallada de {recipe.name} — las pestañas (Ingredientes,
            Preparación, Costos) llegan en PR 3.
          </p>
        )}
      </div>
    </div>
  );
}
