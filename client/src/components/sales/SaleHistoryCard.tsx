import { useEffect, useState } from 'react';
import { MdDeleteOutline, MdExpandMore, MdExpandLess } from 'react-icons/md';
import type { Sale } from '../../types/sale.types';

interface SaleHistoryCardProps {
  sale: Sale;
  onLineDelete: (itemId: string) => Promise<void>;
  onLineUpdate: (itemId: string, quantity: number, currentQty: number) => Promise<void>;
}

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
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    setQuantities(Object.fromEntries(sale.items.map((item) => [item._id, item.quantity])));
  }, [sale]);

  const handleDelete = async (itemId: string) => {
    if (!window.confirm('¿Eliminar esta línea?')) return;
    await onLineDelete(itemId);
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
                {(['Producto', 'Cant.', 'Precio unit.', 'Subtotal', 'Acciones'] as const).map((h) => (
                  <th
                    key={h}
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      color: 'var(--color-text-secondary)',
                      textAlign: h === 'Producto' ? 'left' : 'right',
                      paddingBottom: 'var(--space-xs)',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item, idx) => (
                  <tr key={item._id}>
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
                      value={quantities[item._id] ?? item.quantity}
                      onChange={(event) =>
                        setQuantities((previous) => ({
                          ...previous,
                          [item._id]: Number(event.target.value),
                        }))
                      }
                      style={{ width: '3.5rem', textAlign: 'right' }}
                    />
                  </td>
                  <td style={{ textAlign: 'right', padding: '3px 0' }}>
                    <button
                      type="button"
                      title="Eliminar línea"
                      aria-label={`Eliminar ${item.recipeName}`}
                      onClick={() => void handleDelete(item._id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-warning)' }}
                    >
                      <MdDeleteOutline size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void onLineUpdate(item._id, quantities[item._id] ?? item.quantity, item.quantity)}
                      style={{ border: 'none', borderRadius: 'var(--radius-sm)', padding: '3px 6px', cursor: 'pointer' }}
                    >
                      Guardar
                    </button>
                  </td>
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
