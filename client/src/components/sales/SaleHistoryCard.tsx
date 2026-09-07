import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { MdDeleteOutline, MdExpandMore, MdExpandLess } from 'react-icons/md';
import type { Sale } from '../../types/sale.types';

interface SaleHistoryCardProps {
  sale: Sale;
  onLineDelete: (itemId: string) => Promise<void>;
  onLineUpdate: (itemId: string, quantity: number) => Promise<void>;
}

const AUTOSAVE_DEBOUNCE_MS = 500;

function fmt(v: number) {
  return `$${v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

export function SaleHistoryCard({ sale, onLineDelete, onLineUpdate }: SaleHistoryCardProps) {
  const [expanded, setExpanded] = useState(false);
  // Track the raw input value per item so an empty string stays empty
  // (mobile editing state) instead of collapsing to 0 and firing a DELETE.
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const debounceRefs = useRef<Record<string, number>>({});

  useEffect(() => {
    setQuantities(Object.fromEntries(sale.items.map((item) => [item._id, String(item.quantity)])));
  }, [sale]);

  // Clear any pending debounced saves when the component unmounts so a stale
  // PATCH doesn't fire after the user has navigated away.
  useEffect(() => {
    const refs = debounceRefs.current;
    return () => {
      for (const id of Object.keys(refs)) {
        window.clearTimeout(refs[id]);
        delete refs[id];
      }
    };
  }, []);

  const handleDelete = async (itemId: string) => {
    if (!window.confirm('¿Eliminar esta línea?')) return;
    await onLineDelete(itemId);
  };

  const handleQtyChange =
    (itemId: string, currentQty: number) => (event: ChangeEvent<HTMLInputElement>) => {
      const raw = event.target.value;
      setQuantities((previous) => ({ ...previous, [itemId]: raw }));

      // Empty string is intermediate state during mobile editing — the user
      // typically clears the field to type a new value, and the brief empty
      // window must not trigger a save. DELETE is explicit via the trash icon.
      if (raw === '') {
        const existing = debounceRefs.current[itemId];
        if (existing) window.clearTimeout(existing);
        return;
      }

      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) return;
      // Decrease-only: clamp to [0, currentQty] so the UI can never propose an
      // increase. The server enforces the same rule server-side as defense in depth.
      const clamped = Math.max(0, Math.min(Math.floor(parsed), currentQty));

      const existing = debounceRefs.current[itemId];
      if (existing) window.clearTimeout(existing);
      debounceRefs.current[itemId] = window.setTimeout(() => {
        delete debounceRefs.current[itemId];
        void onLineUpdate(itemId, clamped);
      }, AUTOSAVE_DEBOUNCE_MS);
    };

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid rgba(218, 193, 184, 0.25)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
      }}
    >
      {/* Header — siempre visible */}
      <button
        onClick={() => setExpanded((p) => !p)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-sm)',
          padding: 'var(--space-md)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        {/* Fecha y hora */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.9rem',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              margin: 0,
            }}
          >
            {formatDate(sale.createdAt)}
          </p>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.75rem',
              color: 'var(--color-text-secondary)',
              margin: '2px 0 0',
            }}
          >
            {formatTime(sale.createdAt)} · {sale.items.length}{' '}
            {sale.items.length === 1 ? 'ítem' : 'ítems'}
          </p>
        </div>

        {/* Total */}
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '1.05rem',
            fontWeight: 700,
            color: 'var(--color-primary)',
            flexShrink: 0,
          }}
        >
          {fmt(sale.total)}
        </span>

        {/* Chevron */}
        <span style={{ color: 'var(--color-text-secondary)', flexShrink: 0 }}>
          {expanded ? <MdExpandLess size={20} /> : <MdExpandMore size={20} />}
        </span>
      </button>

      {/* Detalle de ítems */}
      {expanded && (
        <div
          style={{
            borderTop: '1px solid rgba(218, 193, 184, 0.2)',
            padding: 'var(--space-sm) var(--space-md) var(--space-md)',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {(['Producto', 'Cant.', 'Precio unit.', 'Subtotal', ''] as const).map((h, i) => (
                  <th
                    key={h || 'actions'}
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      color: 'var(--color-text-secondary)',
                      textAlign: i === 0 ? 'left' : 'right',
                      paddingBottom: 'var(--space-xs)',
                      width: i === 4 ? '2.5rem' : undefined,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item) => (
                <tr key={item._id}>
                  {/* Producto */}
                  <td
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.8rem',
                      color: 'var(--color-text-primary)',
                      padding: '3px 0',
                    }}
                  >
                    {item.recipeName}
                    {item.itemType === 'tray' && (
                      <span
                        style={{
                          marginLeft: 4,
                          fontSize: '0.6rem',
                          color: 'var(--color-text-secondary)',
                          background: 'rgba(218, 193, 184, 0.2)',
                          padding: '1px 4px',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        B
                      </span>
                    )}
                  </td>

                  {/* Cant. — auto-saves on change (debounced) */}
                  <td
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.8rem',
                      color: 'var(--color-text-secondary)',
                      textAlign: 'right',
                      padding: '3px 0',
                    }}
                  >
                    <input
                      type="number"
                      min={0}
                      max={item.quantity}
                      value={quantities[item._id] ?? String(item.quantity)}
                      onChange={handleQtyChange(item._id, item.quantity)}
                      style={{ width: '3.5rem', textAlign: 'right' }}
                    />
                  </td>

                  {/* Precio unit. */}
                  <td
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.8rem',
                      color: 'var(--color-text-secondary)',
                      textAlign: 'right',
                      padding: '3px 0',
                    }}
                  >
                    {fmt(item.unitPrice)}
                  </td>

                  {/* Subtotal */}
                  <td
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: 'var(--color-text-primary)',
                      textAlign: 'right',
                      padding: '3px 0',
                    }}
                  >
                    {fmt(item.subtotal)}
                  </td>

                  {/* Acciones */}
                  <td
                    style={{
                      textAlign: 'right',
                      padding: '3px 0',
                      width: '2.5rem',
                    }}
                  >
                    <button
                      type="button"
                      title="Eliminar línea"
                      aria-label={`Eliminar ${item.recipeName}`}
                      onClick={() => void handleDelete(item._id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--color-warning)',
                        padding: 0,
                      }}
                    >
                      <MdDeleteOutline size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td
                  colSpan={4}
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                    paddingTop: 'var(--space-xs)',
                    borderTop: '1px solid rgba(218, 193, 184, 0.25)',
                  }}
                >
                  Total
                </td>
                <td
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    color: 'var(--color-primary)',
                    textAlign: 'right',
                    paddingTop: 'var(--space-xs)',
                    borderTop: '1px solid rgba(218, 193, 184, 0.25)',
                  }}
                >
                  {fmt(sale.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}