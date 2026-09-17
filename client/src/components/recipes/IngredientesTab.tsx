import type { Recipe } from '../../types/recipe.types';

interface IngredientesTabProps {
  recipe: Recipe;
}

/**
 * Read-only view of recipe ingredients + complements. Rendered as a
 * vertical list of card-like rows so the quantity pill on the right
 * reads as a discrete unit the user can scan quickly when cooking.
 * Quantity is rendered as a primary-tinted pill (the visual anchor);
 * the ingredient name is the secondary content. Sub-recipes get a
 * small "Sub-receta" badge next to the name.
 */
export function IngredientesTab({ recipe }: IngredientesTabProps) {
  return (
    <div>
      <SectionHeader>Ingredientes</SectionHeader>
      {recipe.ingredients.length === 0 ? (
        <EmptyMessage>Esta receta no tiene ingredientes cargados.</EmptyMessage>
      ) : (
        <ul style={listStyle}>
          {recipe.ingredients.map((ing) => (
            <li key={ing.ingredientId} style={rowStyle}>
              <span style={nameStyle}>
                {ing.isSubRecipe && <SubRecipeBadge />}
                {ing.ingredientName}
              </span>
              <QuantityPill quantity={ing.quantity} unit={unitLabel(ing.ingredientUnit)} />
            </li>
          ))}
        </ul>
      )}

      {recipe.complements && recipe.complements.length > 0 && (
        <>
          <SectionHeader>Complementos</SectionHeader>
          <ul style={listStyle}>
            {recipe.complements.map((c) => (
              <li key={c.complementId} style={rowStyle}>
                <span style={nameStyle}>
                  {c.complementName}
                  {c.complementUnit ? ` (${c.complementUnit})` : ''}
                </span>
                <QuantityPill
                  quantity={c.quantity}
                  unit={complementUnitLabel(c.complementUnit)}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function unitLabel(unit?: string): string {
  if (unit === 'unidad') return 'u.';
  if (unit === 'kg') return 'g';
  return 'g';
}

function complementUnitLabel(unit?: string): string {
  if (unit === 'metro') return 'm';
  if (unit === 'unidad') return 'u.';
  return '';
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontFamily: 'var(--font-body)',
        fontSize: '0.7rem',
        fontWeight: 600,
        color: 'var(--color-text-secondary)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        margin: '0 0 var(--space-sm)',
      }}
    >
      {children}
    </p>
  );
}

function EmptyMessage({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontFamily: 'var(--font-body)',
        fontSize: '0.85rem',
        color: 'var(--color-text-secondary)',
        textAlign: 'center',
        padding: 'var(--space-lg)',
        background: 'var(--color-background)',
        borderRadius: 'var(--radius-md)',
        margin: 0,
      }}
    >
      {children}
    </p>
  );
}

function SubRecipeBadge() {
  return (
    <span
      style={{
        fontFamily: 'var(--font-body)',
        fontSize: '0.6rem',
        fontWeight: 700,
        color: 'var(--color-primary)',
        background: 'rgba(188, 108, 37, 0.14)',
        padding: '2px 8px',
        borderRadius: 'var(--radius-full)',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        whiteSpace: 'nowrap',
      }}
    >
      Sub-receta
    </span>
  );
}

function QuantityPill({
  quantity,
  unit,
}: {
  quantity: number;
  unit: string;
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: '2px',
        background: 'var(--color-primary)',
        color: 'var(--color-on-primary)',
        padding: '4px 12px',
        borderRadius: 'var(--radius-full)',
        fontFamily: 'var(--font-body)',
        fontSize: '0.85rem',
        fontWeight: 700,
        whiteSpace: 'nowrap',
        flexShrink: 0,
        boxShadow: '0 1px 3px rgba(188, 108, 37, 0.2)',
      }}
    >
      <span style={{ fontSize: '0.95rem' }}>{quantity}</span>
      <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>{unit}</span>
    </span>
  );
}

const listStyle: React.CSSProperties = {
  listStyle: 'none',
  padding: 0,
  margin: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-xs)',
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--space-sm)',
  padding: 'var(--space-sm) var(--space-md)',
  background: 'var(--color-background)',
  borderRadius: 'var(--radius-md)',
  fontFamily: 'var(--font-body)',
  fontSize: '0.9rem',
  color: 'var(--color-text-primary)',
  border: '1px solid rgba(218, 193, 184, 0.25)',
  transition: 'background 0.15s',
};

const nameStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-sm)',
  flex: 1,
  minWidth: 0,
};
