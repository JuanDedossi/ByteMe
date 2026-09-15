import type { Recipe } from '../../types/recipe.types';

interface IngredientesTabProps {
  recipe: Recipe;
}

/**
 * Read-only view of recipe ingredients + complements. Extracted from the
 * old `RecipeCard` expand section. The detail page owns the data; this
 * component just renders.
 */
export function IngredientesTab({ recipe }: IngredientesTabProps) {
  return (
    <div>
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
        Ingredientes
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {['Ingrediente', 'Cantidad'].map((h) => (
              <th
                key={h}
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.7rem',
                  color: 'var(--color-text-secondary)',
                  textAlign: 'left',
                  paddingBottom: 'var(--space-xs)',
                  fontWeight: 600,
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {recipe.ingredients.map((ing) => (
            <tr key={ing.ingredientId}>
              <td style={tdStyle}>
                {ing.isSubRecipe && (
                  <span
                    style={{
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      color: 'var(--color-primary)',
                      marginRight: '4px',
                      textTransform: 'uppercase',
                    }}
                  >
                    SR
                  </span>
                )}
                {ing.ingredientName}
              </td>
              <td style={tdStyle}>
                {ing.quantity}
                {ing.ingredientUnit === 'unidad' ? ' u.' : 'g'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {recipe.complements && recipe.complements.length > 0 && (
        <>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.7rem',
              fontWeight: 600,
              color: 'var(--color-text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              margin: 'var(--space-md) 0 var(--space-sm)',
            }}
          >
            Complementos
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Complemento', 'Cantidad'].map((h) => (
                  <th
                    key={h}
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.7rem',
                      color: 'var(--color-text-secondary)',
                      textAlign: 'left',
                      paddingBottom: 'var(--space-xs)',
                      fontWeight: 600,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recipe.complements.map((c) => (
                <tr key={c.complementId}>
                  <td style={tdStyle}>
                    {c.complementName}
                    {c.complementUnit ? ` (${c.complementUnit})` : ''}
                  </td>
                  <td style={tdStyle}>
                    {c.quantity}
                    {c.complementUnit === 'metro'
                      ? ' m'
                      : c.complementUnit === 'unidad'
                        ? ' u.'
                        : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

const tdStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '0.8rem',
  color: 'var(--color-text-primary)',
  padding: '2px 0',
};
