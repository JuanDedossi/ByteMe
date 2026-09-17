import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MdEdit,
  MdDelete,
  MdCheck,
  MdClose,
  MdAttachMoney,
  MdMenuBook,
} from 'react-icons/md';
import type { Recipe } from '../../types/recipe.types';
import type { ProfitRule } from '../../types/profit-rule.types';

interface RecipeCardProps {
  recipe: Recipe;
  profitRules: ProfitRule[];
  onEditRequest: (recipe: Recipe) => void;
  onDelete: (id: string) => Promise<void>;
  onUpdatePrice: (id: string, price: number | null) => Promise<void>;
}

/**
 * Recipe summary card used in the Recipes list. Tapping the card body
 * toggles a breakdown panel showing ingredients, complements, and the
 * cost summary (REQ-REC-14 disambiguation when complements exist).
 * Tapping the explicit "Preparación" button navigates to the prep
 * detail page. Edit/Delete still go through the supplied callbacks.
 */
export function RecipeCard({
  recipe,
  onEditRequest,
  onDelete,
  onUpdatePrice,
}: RecipeCardProps) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [editingPrice, setEditingPrice] = useState(false);
  const [editPrice, setEditPrice] = useState('');
  const [loading, setLoading] = useState(false);

  const fmt = (v: number) =>
    `$${v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handleToggleExpand = () => setExpanded((v) => !v);

  const handleOpenPreparation = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    navigate(`/recetas/${recipe._id}`);
  };

  const hasPreparation =
    !!recipe.preparation && recipe.preparation.steps.length > 0;

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEditRequest(recipe);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(recipe._id);
  };

  const handlePriceEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
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

  const handlePriceReset = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    try {
      await onUpdatePrice(recipe._id, null);
      setEditingPrice(false);
    } finally {
      setLoading(false);
    }
  };

  const handlePriceCancel = (e?: React.SyntheticEvent) => {
    e?.stopPropagation();
    setEditingPrice(false);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleToggleExpand}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleToggleExpand();
        }
      }}
      style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
        cursor: 'pointer',
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
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 'var(--space-sm)',
          }}
        >
          <button
            onClick={handleOpenPreparation}
            style={prepBtnStyle}
            title={
              hasPreparation
                ? 'Ver preparación'
                : 'Agregar pasos de preparación'
            }
          >
            <MdMenuBook size={14} />
            {hasPreparation ? 'Preparación' : '+ Preparación'}
          </button>
          <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
            <button
              onClick={handleEditClick}
              style={iconBtnStyle}
              title="Editar"
            >
              <MdEdit size={18} />
            </button>
            <button
              onClick={handleDeleteClick}
              style={{ ...iconBtnStyle, color: 'var(--color-error)' }}
              title="Eliminar"
            >
              <MdDelete size={18} />
            </button>
          </div>
        </div>
      </div>

      {expanded && <Breakdown recipe={recipe} fmt={fmt} />}
    </div>
  );
}

function Breakdown({ recipe, fmt }: { recipe: Recipe; fmt: (v: number) => string }) {
  const hasComplements = !!recipe.complements && recipe.complements.length > 0;
  return (
    <div
      style={{
        borderTop: '1px solid rgba(218, 193, 184, 0.3)',
        background: '#f8f4db',
        padding: 'var(--space-md) var(--space-lg)',
        fontFamily: 'var(--font-body)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-md)',
      }}
    >
      {recipe.ingredients.length > 0 && (
        <>
          <SectionHeader>Ingredientes</SectionHeader>
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
        </>
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

      <SectionHeader>Costo</SectionHeader>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
        {hasComplements ? (
          <>
            <CostRow label="Costo base (bandejas)">{fmt(recipe.costBase)}</CostRow>
            <CostRow label="Costo total (venta indiv.)">{fmt(recipe.costTotal)}</CostRow>
          </>
        ) : (
          <CostRow label="Costo producción">{fmt(recipe.cost)}</CostRow>
        )}
        {recipe.sellUnit === 'unidad' && recipe.yieldUnits > 1 && (
          <CostRow label="Rendimiento">{recipe.yieldUnits} unidades</CostRow>
        )}
        <CostRow label={`Markup (${recipe.markupPercentage}%)`}>
          {fmt(
            (recipe.sellUnit === 'kg'
              ? recipe.sellingPrice * (recipe.yieldGrams / 1000)
              : recipe.sellingPrice * recipe.yieldUnits) - recipe.cost,
          )}
        </CostRow>
        {recipe.sellUnit === 'kg' ? (
          <>
            <CostRow label="Precio por 100g">{fmt(recipe.pricePer100g)}</CostRow>
            <span
              style={{
                fontSize: '0.7rem',
                color: 'var(--color-text-secondary)',
                textAlign: 'right',
              }}
            >
              ({fmt(recipe.sellingPrice)}/kg)
            </span>
          </>
        ) : (
          <CostRow
            label={
              recipe.yieldUnits > 1
                ? `Precio por unidad (rinde ${recipe.yieldUnits})`
                : 'Precio de venta'
            }
          >
            {fmt(recipe.sellingPrice)}
          </CostRow>
        )}
      </div>
    </div>
  );
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

function CostRow({
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
        fontSize: '0.8rem',
        color: 'var(--color-text-secondary)',
      }}
    >
      <span>{label}</span>
      <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>{children}</span>
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
  background: 'var(--color-surface)',
  borderRadius: 'var(--radius-md)',
  fontFamily: 'var(--font-body)',
  fontSize: '0.85rem',
  color: 'var(--color-text-primary)',
  border: '1px solid rgba(218, 193, 184, 0.25)',
};

const nameStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-sm)',
  flex: 1,
  minWidth: 0,
};

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

const prepBtnStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '0.75rem',
  fontWeight: 600,
  background: 'rgba(188, 108, 37, 0.12)',
  color: 'var(--color-primary)',
  border: 'none',
  borderRadius: 'var(--radius-full)',
  padding: '6px 12px',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
};
