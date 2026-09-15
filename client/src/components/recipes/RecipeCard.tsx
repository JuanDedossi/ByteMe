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

export function RecipeCard({
  recipe,
  onEditRequest,
  onDelete,
  onUpdatePrice,
}: RecipeCardProps) {
  const navigate = useNavigate();
  const [editingPrice, setEditingPrice] = useState(false);
  const [editPrice, setEditPrice] = useState('');
  const [loading, setLoading] = useState(false);

  const fmt = (v: number) =>
    `$${v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handleOpenDetail = () => {
    navigate(`/recetas/${recipe._id}`);
  };

  const handleOpenPreparation = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    navigate(`/recetas/${recipe._id}?tab=preparacion`);
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
      onClick={handleOpenDetail}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleOpenDetail();
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
