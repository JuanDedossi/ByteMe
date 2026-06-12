import { useState } from 'react';
import { MdShoppingCart } from 'react-icons/md';
import { StockEditor } from '../common/StockEditor';
import type { Recipe } from '../../types/recipe.types';

interface RecipeStockCardProps {
  recipe: Recipe;
  onStockChange: (id: string, stock: number) => Promise<void>;
  onSell: (recipe: Recipe) => void;
}

export function RecipeStockCard({
  recipe,
  onStockChange,
  onSell,
}: RecipeStockCardProps) {
  const [saving, setSaving] = useState(false);

  const fmt = (v: number) =>
    `$${v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handleStockChange = async (stock: number) => {
    setSaving(true);
    try {
      await onStockChange(recipe._id, stock);
    } finally {
      setSaving(false);
    }
  };

  const isWeight = recipe.sellUnit === 'kg';

  const stockColor =
    recipe.stock === 0
      ? 'var(--color-error)'
      : !isWeight && recipe.stock <= 3
        ? 'var(--color-warning)'
        : isWeight && recipe.stock <= 500
          ? 'var(--color-warning)'
          : 'var(--color-text-primary)';

  const formatStock = (s: number) => {
    if (!isWeight) return `${s}`;
    return s >= 1000 ? `${(s / 1000).toFixed(1)}kg` : `${s}g`;
  };

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-sm)',
        padding: 'var(--space-md) var(--space-lg)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-md)',
      }}
    >
      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.95rem',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            margin: 0,
          }}
        >
          {recipe.name}
        </p>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.85rem',
            fontWeight: 700,
            color: 'var(--color-primary)',
            margin: 'var(--space-xs) 0 0',
          }}
        >
          {isWeight ? `${fmt(recipe.pricePer100g)}` : fmt(recipe.sellingPrice)}
        </p>
        {isWeight && (
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.7rem',
              color: 'var(--color-text-secondary)',
              margin: 0,
            }}
          >
            {fmt(recipe.sellingPrice)}/kg
          </p>
        )}
      </div>

      {/* Stock editor */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.7rem',
            color: 'var(--color-text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          Stock
        </span>
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '1rem',
            fontWeight: 700,
            color: stockColor,
          }}
        >
          {formatStock(recipe.stock)}
        </span>
        <StockEditor
          stock={recipe.stock}
          onChange={handleStockChange}
          disabled={saving}
          step={isWeight ? 100 : 1}
          unit={isWeight ? 'g' : 'u.'}
        />
      </div>

      {/* Vender button */}
      <button
        onClick={() => onSell(recipe)}
        disabled={recipe.stock === 0}
        style={{
          background:
            recipe.stock === 0
              ? 'rgba(188, 108, 37, 0.25)'
              : 'var(--color-primary)',
          color:
            recipe.stock === 0
              ? 'rgba(188, 108, 37, 0.6)'
              : 'var(--color-on-primary)',
          border: 'none',
          borderRadius: 'var(--radius-sm)',
          padding: 'var(--space-sm) var(--space-md)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-xs)',
          cursor: recipe.stock === 0 ? 'not-allowed' : 'pointer',
          fontFamily: 'var(--font-body)',
          fontSize: '0.85rem',
          fontWeight: 600,
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
        title={recipe.stock === 0 ? 'Sin stock' : 'Vender'}
      >
        <MdShoppingCart size={16} />
        Vender
      </button>
    </div>
  );
}
