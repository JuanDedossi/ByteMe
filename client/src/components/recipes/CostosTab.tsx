import type { Recipe } from '../../types/recipe.types';

interface CostosTabProps {
  recipe: Recipe;
}

/**
 * Read-only cost breakdown: costBase / costTotal (when complements exist),
 * yield, markup, and selling price.
 *
 * REQ-REC-14 disambiguation preserved from the original `RecipeCard` expand:
 * recipes with complements show both costBase (for use in trays) and
 * costTotal (with packaging, for individual sale). Recipes without
 * complements show a single cost line.
 */
export function CostosTab({ recipe }: CostosTabProps) {
  const fmt = (v: number) =>
    `$${v.toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const hasComplements =
    recipe.complements && recipe.complements.length > 0;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-xs)',
      }}
    >
      {hasComplements ? (
        <>
          <Row label="Costo base (para usar en bandejas)">
            <strong>{fmt(recipe.costBase)}</strong>
          </Row>
          <Row label="Costo total (con empaque, para venta individual)">
            <strong>{fmt(recipe.costTotal)}</strong>
          </Row>
        </>
      ) : (
        <Row label="Costo producción">
          <strong>{fmt(recipe.cost)}</strong>
        </Row>
      )}
      {recipe.sellUnit === 'unidad' && recipe.yieldUnits > 1 && (
        <Row label="Rendimiento">
          <strong>{recipe.yieldUnits} unidades</strong>
        </Row>
      )}
      <Row label={`Markup (${recipe.markupPercentage}%)`}>
        <strong>
          {fmt(
            (recipe.sellUnit === 'kg'
              ? recipe.sellingPrice * (recipe.yieldGrams / 1000)
              : recipe.sellingPrice * recipe.yieldUnits) - recipe.cost,
          )}
        </strong>
      </Row>
      {recipe.sellUnit === 'kg' ? (
        <>
          <Row label="Precio por 100g">
            <strong style={{ fontSize: '0.95rem' }}>
              {fmt(recipe.pricePer100g)}
            </strong>
          </Row>
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.75rem',
              color: 'var(--color-text-secondary)',
            }}
          >
            ({fmt(recipe.sellingPrice)}/kg)
          </span>
        </>
      ) : (
        <Row label={recipe.yieldUnits > 1 ? `Precio por unidad (rinde ${recipe.yieldUnits})` : 'Precio de venta'}>
          <strong style={{ fontSize: '0.95rem' }}>
            {fmt(recipe.sellingPrice)}
          </strong>
        </Row>
      )}
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontFamily: 'var(--font-body)',
        fontSize: '0.85rem',
        color: 'var(--color-text-secondary)',
      }}
    >
      <span>{label}</span>
      <span style={{ color: 'var(--color-primary)' }}>{children}</span>
    </div>
  );
}
