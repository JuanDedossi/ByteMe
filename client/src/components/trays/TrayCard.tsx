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
import type { Tray } from '../../types/tray.types';

interface TrayCardProps {
  tray: Tray;
  onEditRequest: (tray: Tray) => void;
  onDelete: (id: string) => void;
  onUpdatePrice: (id: string, price: number | null) => Promise<void>;
}

export function TrayCard({
  tray,
  onEditRequest,
  onDelete,
  onUpdatePrice,
}: TrayCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [editingPrice, setEditingPrice] = useState(false);
  const [editPrice, setEditPrice] = useState('');
  const [loading, setLoading] = useState(false);

  const fmt = (v: number) =>
    `$${v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handlePriceEdit = () => {
    setEditPrice(tray.sellingPrice.toFixed(2));
    setEditingPrice(true);
  };

  const handlePriceSave = async () => {
    const val = parseFloat(editPrice);
    if (isNaN(val) || val <= 0) return;
    setLoading(true);
    try {
      await onUpdatePrice(tray._id, val);
      setEditingPrice(false);
    } finally {
      setLoading(false);
    }
  };

  const handlePriceReset = async () => {
    setLoading(true);
    try {
      await onUpdatePrice(tray._id, null);
      setEditingPrice(false);
    } finally {
      setLoading(false);
    }
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
        <>
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
                {tray.name}
              </span>
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.75rem',
                  color: 'var(--color-text-secondary)',
                  margin: 'var(--space-xs) 0 0',
                }}
              >
                {tray.profitRuleName} · {tray.markupPercentage}% markup ·{' '}
                {tray.recipes.length}{' '}
                {tray.recipes.length === 1 ? 'receta' : 'recetas'}
              </p>
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
                      if (e.key === 'Escape') setEditingPrice(false);
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
                    onClick={() => setEditingPrice(false)}
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
                      {fmt(tray.sellingPrice)}
                    </span>
                    <button
                      onClick={handlePriceEdit}
                      style={{ ...iconBtnStyle, padding: '2px' }}
                      title="Editar precio"
                    >
                      <MdAttachMoney size={14} />
                    </button>
                  </div>
                  {tray.customSellingPrice !== null && (
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
                onClick={() => onEditRequest(tray)}
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
                onClick={() => onDelete(tray._id)}
                style={{ ...iconBtnStyle, color: 'var(--color-error)' }}
                title="Eliminar"
              >
                <MdDelete size={18} />
              </button>
            </div>
          </div>
        </>
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
            Recetas
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Receta', 'Cantidad', 'Costo'].map((h) => (
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
              {tray.recipes.map((r) => (
                <tr key={r.recipeId}>
                  <td style={tdStyle}>{r.recipeName}</td>
                  <td style={tdStyle}>
                    {r.quantity}
                    {r.recipeSellUnit === 'kg' ? 'g' : ' u.'}
                  </td>
                  <td style={tdStyle}>{fmt(r.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Complementos table (only when the tray has any) */}
          {tray.complements && tray.complements.length > 0 && (
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
                  {tray.complements.map((c) => (
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
                      <td style={tdStyle}>
                        {c.cost !== undefined ? fmt(c.cost) : ''}
                      </td>
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
             * REQ-TRA-2: cost = sum(recipe.costBase × qty) + sum(tray.complements × qty).
             * Single label "Costo de producción" — the cost is already correct
             * because the backend uses costBase. The breakdown above (Recetas +
             * Complementos) shows where the value comes from.
             */}
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.8rem',
                color: 'var(--color-text-secondary)',
              }}
            >
              Costo de producción: <strong>{fmt(tray.cost)}</strong>
            </span>
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.8rem',
                color: 'var(--color-text-secondary)',
              }}
            >
              Markup ({tray.markupPercentage}%):{' '}
              <strong>{fmt(tray.sellingPrice - tray.cost)}</strong>
            </span>
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.9rem',
                fontWeight: 700,
                color: 'var(--color-primary)',
              }}
            >
              Precio de venta: {fmt(tray.sellingPrice)}
            </span>
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
