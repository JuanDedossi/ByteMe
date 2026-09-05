import { useState } from 'react';
import { MdShoppingCart } from 'react-icons/md';
import { StockEditor } from '../common/StockEditor';
import { InlinePriceEdit } from '../common/InlinePriceEdit';
import type { Recipe } from '../../types/recipe.types';

interface RecipeStockCardProps {
  recipe: Recipe;
  onStockChange: (id: string, stock: number) => Promise<void>;
  onPriceChange: (id: string, newPrice: number) => Promise<void>;
  onSell: (recipe: Recipe) => void;
}

export function RecipeStockCard({
  recipe,
  onStockChange,
  onPriceChange,
  onSell,
}: RecipeStockCardProps) {
  const [saving, setSaving] = useState(false);
  const [savingPrice, setSavingPrice] = useState(false);

  const handleStockChange = async (stock: number) => {
    setSaving(true);
    try {
      await onStockChange(recipe._id, stock);
    } finally {
      setSaving(false);
    }
  };

  const handlePriceSave = async (displayPrice: number) => {
    // For kg recipes the card shows pricePer100g; the API stores per-kg
    // as `customSellingPrice`. For unit recipes the displayed value is
    // already what the API expects.
    const apiPrice = recipe.sellUnit === 'kg' ? displayPrice * 10 : displayPrice;
    setSavingPrice(true);
    try {
      await onPriceChange(recipe._id, apiPrice);
    } finally {
      setSavingPrice(false);
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
        <InlinePriceEdit
          value={isWeight ? recipe.pricePer100g : recipe.sellingPrice}
          onSave={handlePriceSave}
          disabled={savingPrice}
          suffix={isWeight ? `${(isWeight ? recipe.pricePer100g * 10 : recipe.sellingPrice).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/kg` : undefined}
        />
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
