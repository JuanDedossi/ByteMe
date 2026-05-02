import { MdEdit, MdDelete } from 'react-icons/md';
import type { Ingredient } from '../../types/ingredient.types';

interface IngredientCardProps {
  ingredient: Ingredient;
  onEditRequest: (ingredient: Ingredient) => void;
  onDelete: (id: string) => void;
}

export function IngredientCard({ ingredient, onEditRequest, onDelete }: IngredientCardProps) {
  const formatCurrency = (value: number) =>
    `$${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-md) var(--space-lg)',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-sm)',
      }}
    >
      {/* Name row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-sm)' }}>
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '1rem',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
          }}
        >
          {ingredient.name}
        </span>

        <div style={{ display: 'flex', gap: 'var(--space-xs)', flexShrink: 0 }}>
          <button onClick={() => onEditRequest(ingredient)} style={iconBtnStyle('var(--color-secondary)')}>
            <MdEdit size={18} />
          </button>
          <button onClick={() => onDelete(ingredient._id)} style={iconBtnStyle('var(--color-error)')}>
            <MdDelete size={18} />
          </button>
        </div>
      </div>

      {/* Cost row */}
      <div style={{ display: 'flex', gap: 'var(--space-lg)' }}>
        {ingredient.unit === 'unidad' ? (
          <div>
            <span style={labelStyle}>Por unidad</span>
            <p style={valueStyle}>{formatCurrency(ingredient.costPerUnit)}</p>
          </div>
        ) : (
          <>
            <div>
              <span style={labelStyle}>Por 100g</span>
              <p style={valueStyle}>{formatCurrency(ingredient.costPer100g)}</p>
            </div>
            <div>
              <span style={labelStyle}>Por kg</span>
              <p style={valueStyle}>{formatCurrency(ingredient.costPerKg)}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const iconBtnStyle = (color: string): React.CSSProperties => ({
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color,
  display: 'flex',
  alignItems: 'center',
  padding: 'var(--space-xs)',
  borderRadius: 'var(--radius-sm)',
});

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '0.7rem',
  color: 'var(--color-text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  display: 'block',
};

const valueStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '1rem',
  fontWeight: 600,
  color: 'var(--color-primary)',
  margin: '2px 0 0',
};
