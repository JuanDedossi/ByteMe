import { useState } from 'react';
import { MdShoppingCart } from 'react-icons/md';
import { StockEditor } from '../common/StockEditor';
import type { Tray } from '../../types/tray.types';

interface TrayStockCardProps {
  tray: Tray;
  onStockChange: (id: string, stock: number) => Promise<void>;
  onSell: (tray: Tray) => void;
}

export function TrayStockCard({
  tray,
  onStockChange,
  onSell,
}: TrayStockCardProps) {
  const [saving, setSaving] = useState(false);

  const fmt = (v: number) =>
    `$${v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handleStockChange = async (stock: number) => {
    setSaving(true);
    try {
      await onStockChange(tray._id, stock);
    } finally {
      setSaving(false);
    }
  };

  const stockColor =
    tray.stock === 0
      ? 'var(--color-error)'
      : tray.stock <= 3
        ? 'var(--color-warning)'
        : 'var(--color-text-primary)';

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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-xs)',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.95rem',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {tray.name}
          </p>
        </div>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.85rem',
            fontWeight: 700,
            color: 'var(--color-primary)',
            margin: 'var(--space-xs) 0 0',
          }}
        >
          {fmt(tray.sellingPrice)}
        </p>
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
          {tray.stock}
        </span>
        <StockEditor
          stock={tray.stock}
          onChange={handleStockChange}
          disabled={saving}
          step={1}
          unit="u."
        />
      </div>

      {/* Vender button */}
      <button
        onClick={() => onSell(tray)}
        disabled={tray.stock === 0}
        style={{
          background:
            tray.stock === 0
              ? 'rgba(188, 108, 37, 0.25)'
              : 'var(--color-primary)',
          color:
            tray.stock === 0
              ? 'rgba(188, 108, 37, 0.6)'
              : 'var(--color-on-primary)',
          border: 'none',
          borderRadius: 'var(--radius-sm)',
          padding: 'var(--space-sm) var(--space-md)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-xs)',
          cursor: tray.stock === 0 ? 'not-allowed' : 'pointer',
          fontFamily: 'var(--font-body)',
          fontSize: '0.85rem',
          fontWeight: 600,
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
        title={tray.stock === 0 ? 'Sin stock' : 'Vender'}
      >
        <MdShoppingCart size={16} />
        Vender
      </button>
    </div>
  );
}
