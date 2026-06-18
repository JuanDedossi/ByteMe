import { useState } from 'react';
import {
  MdEdit,
  MdDelete,
  MdExpandMore,
  MdExpandLess,
  MdCheck,
  MdClose,
  MdAttachMoney,
} from 'react-icons/md';
import type { Recipe } from '../../types/recipe.types';
import type { ProfitRule } from '../../types/profit-rule.types';

interface RecipeCardProps {
  recipe: Recipe;
  profitRules: ProfitRule[];
  onEditRequest: (recipe: Recipe) => void;
  onDelete: (id: string) => void;
  onUpdatePrice: (id: string, price: number | null) => Promise<void>;
}

export function RecipeCard({
  recipe,
  onEditRequest,
  onDelete,
  onUpdatePrice,
}: RecipeCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [editingPrice, setEditingPrice] = useState(false);
  const [editPrice, setEditPrice] = useState('');
  const [loading, setLoading] = useState(false);

  const fmt = (v: number) =>
    `$${v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handlePriceEdit = () => {
    setEditPrice(recipe.sellingPrice.toFixed(2));
    setEditingPrice(true);
  };

  const handlePriceSave = async () => {
    const val = parseFloat(editPrice);
    if (isNaN(val) || val <= 0) return;
    setLoading(true);
    try {
      await onUpdatePrice(recipe._id, val);
      setEditingPrice(false);
    } finally {
      setLoading(false);
    }
  };

  const handlePriceReset = async () => {
    setLoading(true);
    try {
      await onUpdatePrice(recipe._id, null);
      setEditingPrice(false);
    } finally {
      setLoading(false);
    }
  };

  const handlePriceCancel = () => {
    setEditingPrice(false);
  };

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
      }}
    >
      {/* Main row */}
      <div
        style={{
          padding: 'var(--space-md) var(--space-lg)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-xs)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <div style={{ flex: 1 }}>
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '1rem',
                fontWeight: 600,
                color: 'var(--color-text-primary)',
              }}
            >
              {recipe.name}
            </span>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.75rem',
                color: 'var(--color-text-secondary)',
                margin: 'var(--space-xs) 0 0',
              }}
            >
              {recipe.profitRuleName} · {recipe.markupPercentage}% markup
            </p>
            {recipe.isSubRecipe && (
              <span
                style={{
                  display: 'inline-block',
                  marginTop: 'var(--space-xs)',
                  padding: '2px var(--space-xs)',
                  background: 'rgba(188, 108, 37, 0.12)',
                  borderRadius: 'var(--radius-sm)',
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  color: 'var(--color-primary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Sub-receta
              </span>
            )}
          </div>
          <div style={{ textAlign: 'right', marginLeft: 'var(--space-md)' }}>
            {editingPrice ? (
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.75rem',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  $
                </span>
                <input
                  type="number"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  autoFocus
                  min="0"
                  step="0.01"
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    width: '80px',
                    border: 'none',
                    borderBottom: '2px solid var(--color-primary)',
                    outline: 'none',
                    background: 'transparent',
                    color: 'var(--color-primary)',
                    textAlign: 'right',
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handlePriceSave();
                    if (e.key === 'Escape') handlePriceCancel();
                  }}
                />
                <button
                  onClick={handlePriceSave}
                  disabled={loading}
                  style={{ ...iconBtnStyle, color: 'var(--color-success)' }}
                >
                  <MdCheck size={16} />
                </button>
                <button
                  onClick={handlePriceCancel}
                  disabled={loading}
                  style={iconBtnStyle}
                >
                  <MdClose size={16} />
                </button>
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    justifyContent: 'flex-end',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '1.2rem',
                      fontWeight: 700,
                      color: 'var(--color-primary)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {recipe.sellUnit === 'kg'
                      ? `${fmt(recipe.pricePer100g)}`
                      : fmt(recipe.sellingPrice)}
                  </span>
                  <button
                    onClick={handlePriceEdit}
                    style={{ ...iconBtnStyle, padding: '2px' }}
                    title="Editar precio"
                  >
                    <MdAttachMoney size={14} />
                  </button>
                </div>
                {recipe.sellUnit === 'kg' && (
                  <span
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.7rem',
                      color: 'var(--color-text-secondary)',
                      whiteSpace: 'nowrap',
                      display: 'block',
                    }}
                  >
                    {fmt(recipe.sellingPrice)}/kg
                  </span>
                )}
                {recipe.customSellingPrice !== null && (
                  <span
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.65rem',
                      color: 'var(--color-warning)',
                      whiteSpace: 'nowrap',
                      display: 'block',
                      cursor: 'pointer',
                    }}
                    onClick={handlePriceReset}
                    title="Precio manual — click para resetear"
                  >
                    precio manual ↺
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            marginTop: 'var(--space-xs)',
          }}
        >
          <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
            <button
              onClick={() => onEditRequest(recipe)}
              style={iconBtnStyle}
              title="Editar"
            >
              <MdEdit size={18} />
            </button>
            <button
              onClick={() => setExpanded((v) => !v)}
              style={iconBtnStyle}
              title="Ver detalle"
            >
              {expanded ? (
                <MdExpandLess size={18} />
              ) : (
                <MdExpandMore size={18} />
              )}
            </button>
            <button
              onClick={() => onDelete(recipe._id)}
              style={{ ...iconBtnStyle, color: 'var(--color-error)' }}
              title="Eliminar"
            >
              <MdDelete size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div
          style={{
            borderTop: '1px solid rgba(218, 193, 184, 0.2)',
            padding: 'var(--space-md) var(--space-lg)',
            background: '#f8f4db',
          }}
        >
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
                {['Ingrediente', 'Cantidad', 'Costo'].map((h) => (
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
                  <td style={tdStyle}>{fmt(ing.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Complementos table (only when the recipe has any) */}
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
                    {['Complemento', 'Cantidad', 'Costo'].map((h) => (
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
                        {/* P4 disambiguation: name (unit) */}
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
                      <td style={tdStyle}>{c.cost !== undefined ? fmt(c.cost) : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          <div
            style={{
              marginTop: 'var(--space-sm)',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}
          >
            {/*
             * REQ-REC-14: when complements exist, show BOTH costBase and
             * costTotal with disambiguating labels. Otherwise show one line
             * (costBase === costTotal when no complements).
             */}
            {recipe.complements && recipe.complements.length > 0 ? (
              <>
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.8rem',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  Costo base (para usar en bandejas): <strong>{fmt(recipe.costBase)}</strong>
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.8rem',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  Costo total (con empaque, para venta individual):{' '}
                  <strong>{fmt(recipe.costTotal)}</strong>
                </span>
              </>
            ) : (
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.8rem',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Costo producción: <strong>{fmt(recipe.cost)}</strong>
              </span>
            )}
            {recipe.sellUnit === 'unidad' && recipe.yieldUnits > 1 && (
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.8rem',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Rendimiento: <strong>{recipe.yieldUnits} unidades</strong>
              </span>
            )}
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.8rem',
                color: 'var(--color-text-secondary)',
              }}
            >
              Markup ({recipe.markupPercentage}%):{' '}
              <strong>
                {fmt(
                  (recipe.sellUnit === 'kg'
                    ? recipe.sellingPrice * (recipe.yieldGrams / 1000)
                    : recipe.sellingPrice * recipe.yieldUnits) - recipe.cost,
                )}
              </strong>
            </span>
            {recipe.sellUnit === 'kg' ? (
              <>
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    color: 'var(--color-primary)',
                  }}
                >
                  Precio por 100g: {fmt(recipe.pricePer100g)}
                </span>
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
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  color: 'var(--color-primary)',
                }}
              >
                {recipe.yieldUnits > 1
                  ? `Precio por unidad (rinde ${recipe.yieldUnits}): ${fmt(recipe.sellingPrice)}`
                  : `Precio de venta: ${fmt(recipe.sellingPrice)}`}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const iconBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: 'var(--space-xs)',
  color: 'var(--color-text-secondary)',
  borderRadius: 'var(--radius-sm)',
  display: 'flex',
  alignItems: 'center',
};

const tdStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '0.8rem',
  color: 'var(--color-text-primary)',
  padding: '2px 0',
};
