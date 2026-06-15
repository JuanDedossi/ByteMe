import { useState } from 'react';
import { MdEdit, MdDelete, MdCheck, MdClose } from 'react-icons/md';
import type { ProfitRule, UpdateProfitRulePayload } from '../../types/profit-rule.types';

interface ProfitRuleCardProps {
  rule: ProfitRule;
  onEdit: (id: string, payload: UpdateProfitRulePayload) => Promise<void>;
  onDelete: (id: string) => void;
}

export function ProfitRuleCard({ rule, onEdit, onDelete }: ProfitRuleCardProps) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(rule.name);
  const [editPercentage, setEditPercentage] = useState(String(rule.markupPercentage));
  const [editDescription, setEditDescription] = useState(rule.description || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    const name = editName.trim();
    const markupPercentage = parseFloat(editPercentage);
    if (!name || isNaN(markupPercentage) || markupPercentage < 0) return;

    const payload: UpdateProfitRulePayload = {};
    if (name !== rule.name) payload.name = name;
    if (markupPercentage !== rule.markupPercentage) payload.markupPercentage = markupPercentage;
    if (editDescription.trim() !== (rule.description || '')) payload.description = editDescription.trim();

    if (Object.keys(payload).length === 0) {
      setEditing(false);
      return;
    }

    setLoading(true);
    try {
      await onEdit(rule._id, payload);
      setEditing(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setEditName(rule.name);
    setEditPercentage(String(rule.markupPercentage));
    setEditDescription(rule.description || '');
  };

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-md) var(--space-lg)',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-sm)',
      }}
    >
      {editing ? (
        <>
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
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
            }}
            autoFocus
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <input
              type="number"
              value={editPercentage}
              onChange={(e) => setEditPercentage(e.target.value)}
              min="0"
              step="1"
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.9rem',
                border: 'none',
                borderBottom: '2px solid var(--color-primary)',
                outline: 'none',
                padding: 'var(--space-xs) 0',
                background: 'transparent',
                color: 'var(--color-text-primary)',
                width: '80px',
              }}
            />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>%</span>
          </div>
          <input
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            placeholder="Descripción (opcional)"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.8rem',
              border: 'none',
              borderBottom: '1px solid var(--color-text-secondary)',
              outline: 'none',
              padding: 'var(--space-xs) 0',
              background: 'transparent',
              color: 'var(--color-text-secondary)',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)' }}>
            <button onClick={handleCancel} disabled={loading} style={iconBtnStyle}>
              <MdClose size={20} />
            </button>
            <button onClick={handleSave} disabled={loading} style={{ ...iconBtnStyle, color: 'var(--color-success)' }}>
              <MdCheck size={20} />
            </button>
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {rule.name}
                </span>
              </div>
              {rule.description && (
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.75rem',
                    color: 'var(--color-text-secondary)',
                    margin: 'var(--space-xs) 0 0',
                  }}
                >
                  {rule.description}
                </p>
              )}
            </div>
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '1.25rem',
                fontWeight: 700,
                color: 'var(--color-primary)',
                whiteSpace: 'nowrap',
              }}
            >
              {rule.markupPercentage}%
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-xs)' }}>
            <button onClick={() => setEditing(true)} style={iconBtnStyle} title="Editar">
              <MdEdit size={18} />
            </button>
            <button onClick={() => onDelete(rule._id)} style={{ ...iconBtnStyle, color: 'var(--color-error)' }} title="Eliminar">
              <MdDelete size={18} />
            </button>
          </div>
        </>
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
