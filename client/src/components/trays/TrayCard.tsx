import { useState } from 'react';
import { MdEdit, MdDelete, MdExpandMore, MdExpandLess, MdCheck, MdClose, MdAttachMoney } from 'react-icons/md';
import type { Tray, UpdateTrayPayload } from '../../types/tray.types';
import type { ProfitRule } from '../../types/profit-rule.types';

interface TrayCardProps {
  tray: Tray;
  profitRules: ProfitRule[];
  onEdit: (id: string, payload: UpdateTrayPayload) => Promise<void>;
  onDelete: (id: string) => void;
  onUpdatePrice: (id: string, price: number | null) => Promise<void>;
}

export function TrayCard({ tray, profitRules, onEdit, onDelete, onUpdatePrice }: TrayCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState(tray.name);
  const [editRuleId, setEditRuleId] = useState(tray.profitRuleId);
  const [editingPrice, setEditingPrice] = useState(false);
  const [editPrice, setEditPrice] = useState('');
  const [loading, setLoading] = useState(false);

  const fmt = (v: number) =>
    `$${v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handleSave = async () => {
    const payload: UpdateTrayPayload = {};
    if (editName.trim() !== tray.name) payload.name = editName.trim();
    if (editRuleId !== tray.profitRuleId) payload.profitRuleId = editRuleId;
    if (Object.keys(payload).length === 0) { setEditingName(false); return; }
    setLoading(true);
    try {
      await onEdit(tray._id, payload);
      setEditingName(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditName(tray.name);
    setEditRuleId(tray.profitRuleId);
    setEditingName(false);
  };

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
      <div style={{ padding: 'var(--space-md) var(--space-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
        {editingName ? (
          <>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              autoFocus
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '1rem',
                fontWeight: 600,
                border: 'none',
                borderBottom: '2px solid var(--color-primary)',
                outline: 'none',
                padding: 'var(--space-xs) 0',
                background: 'transparent',
                color: 'var(--color-text-primary)',
                width: '100%',
              }}
            />
            <select
              value={editRuleId}
              onChange={(e) => setEditRuleId(e.target.value)}
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.85rem',
                border: '1.5px solid rgba(218, 193, 184, 0.4)',
                borderRadius: 'var(--radius-sm)',
                padding: 'var(--space-xs) var(--space-sm)',
                color: 'var(--color-text-primary)',
                background: 'transparent',
                marginTop: 'var(--space-xs)',
              }}
            >
              {profitRules.map((r) => (
                <option key={r._id} value={r._id}>{r.name} — {r.markupPercentage}%</option>
              ))}
            </select>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-xs)', marginTop: 'var(--space-xs)' }}>
              <button onClick={handleCancel} disabled={loading} style={iconBtnStyle}><MdClose size={20} /></button>
              <button onClick={handleSave} disabled={loading} style={{ ...iconBtnStyle, color: 'var(--color-success)' }}><MdCheck size={20} /></button>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {tray.name}
                </span>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: 'var(--space-xs) 0 0' }}>
                  {tray.profitRuleName} · {tray.markupPercentage}% markup · {tray.recipes.length} {tray.recipes.length === 1 ? 'receta' : 'recetas'}
                </p>
              </div>
              <div style={{ textAlign: 'right', marginLeft: 'var(--space-md)' }}>
                {editingPrice ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>$</span>
                    <input
                      type="number"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      autoFocus
                      min="0"
                      step="0.01"
                      style={{ fontFamily: 'var(--font-body)', fontSize: '0.95rem', fontWeight: 700, width: '80px', border: 'none', borderBottom: '2px solid var(--color-primary)', outline: 'none', background: 'transparent', color: 'var(--color-primary)', textAlign: 'right' }}
                      onKeyDown={(e) => { if (e.key === 'Enter') handlePriceSave(); if (e.key === 'Escape') setEditingPrice(false); }}
                    />
                    <button onClick={handlePriceSave} disabled={loading} style={{ ...iconBtnStyle, color: 'var(--color-success)' }}><MdCheck size={16} /></button>
                    <button onClick={() => setEditingPrice(false)} disabled={loading} style={iconBtnStyle}><MdClose size={16} /></button>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-primary)', whiteSpace: 'nowrap' }}>
                        {fmt(tray.sellingPrice)}
                      </span>
                      <button onClick={handlePriceEdit} style={{ ...iconBtnStyle, padding: '2px' }} title="Editar precio"><MdAttachMoney size={14} /></button>
                    </div>
                    {tray.customSellingPrice !== null && (
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: 'var(--color-warning)', whiteSpace: 'nowrap', display: 'block', cursor: 'pointer' }} onClick={handlePriceReset} title="Precio manual — click para resetear">
                        precio manual ↺
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: 'var(--space-xs)' }}>
              <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                <button onClick={() => setEditingName(true)} style={iconBtnStyle} title="Editar"><MdEdit size={18} /></button>
                <button onClick={() => setExpanded((v) => !v)} style={iconBtnStyle} title="Ver detalle">
                  {expanded ? <MdExpandLess size={18} /> : <MdExpandMore size={18} />}
                </button>
                <button onClick={() => onDelete(tray._id)} style={{ ...iconBtnStyle, color: 'var(--color-error)' }} title="Eliminar"><MdDelete size={18} /></button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Expanded detail */}
      {expanded && !editingName && (
        <div style={{ borderTop: '1px solid rgba(218, 193, 184, 0.2)', padding: 'var(--space-md) var(--space-lg)', background: '#f8f4db' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 var(--space-sm)' }}>
            Recetas
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Receta', 'Cantidad', 'Costo'].map((h) => (
                  <th key={h} style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', color: 'var(--color-text-secondary)', textAlign: 'left', paddingBottom: 'var(--space-xs)', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tray.recipes.map((r) => (
                <tr key={r.recipeId}>
                  <td style={tdStyle}>{r.recipeName}</td>
                  <td style={tdStyle}>{r.quantity}{r.recipeSellUnit === 'kg' ? 'g' : ' u.'}</td>
                  <td style={tdStyle}>{fmt(r.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 'var(--space-sm)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
              Costo de producción: <strong>{fmt(tray.cost)}</strong>
            </span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
              Markup ({tray.markupPercentage}%): <strong>{fmt(tray.sellingPrice - tray.cost)}</strong>
            </span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-primary)' }}>
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
