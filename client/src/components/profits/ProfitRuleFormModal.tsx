import { useState } from 'react';
import { Modal } from '../common/Modal';
import type { CreateProfitRulePayload } from '../../types/profit-rule.types';

interface ProfitRuleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateProfitRulePayload) => Promise<void>;
}

export function ProfitRuleFormModal({ isOpen, onClose, onSubmit }: ProfitRuleFormModalProps) {
  const [name, setName] = useState('');
  const [markupPercentage, setMarkupPercentage] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const isValid = name.trim().length >= 2 && markupPercentage !== '' && parseFloat(markupPercentage) >= 0;

  const handleSubmit = async () => {
    if (!isValid) return;
    setLoading(true);
    try {
      await onSubmit({
        name: name.trim(),
        markupPercentage: parseFloat(markupPercentage),
        description: description.trim() || undefined,
      });
      setName('');
      setMarkupPercentage('');
      setDescription('');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setMarkupPercentage('');
    setDescription('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Nueva Regla de Ganancia">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
        {/* Name */}
        <div>
          <label style={labelStyle}>Nombre</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='Ej: "Oferta especial"'
            style={inputStyle}
            autoFocus
          />
        </div>

        {/* Markup */}
        <div>
          <label style={labelStyle}>Porcentaje de markup</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <input
              type="number"
              value={markupPercentage}
              onChange={(e) => setMarkupPercentage(e.target.value)}
              placeholder="Ej: 25"
              min="0"
              step="1"
              style={{ ...inputStyle, flex: 1 }}
            />
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '1.1rem',
                fontWeight: 600,
                color: 'var(--color-text-secondary)',
              }}
            >
              %
            </span>
          </div>
        </div>

        {/* Description */}
        <div>
          <label style={labelStyle}>
            Descripción <span style={{ fontWeight: 400, color: 'var(--color-text-secondary)' }}>(opcional)</span>
          </label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Breve descripción de la regla"
            style={inputStyle}
          />
        </div>

        {/* Preview */}
        {markupPercentage !== '' && parseFloat(markupPercentage) >= 0 && (
          <div
            style={{
              background: '#f8f4db',
              borderRadius: 'var(--radius-sm)',
              padding: 'var(--space-md)',
            }}
          >
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: 0 }}>
              Ejemplo: si una receta cuesta <strong>$1.000</strong>, el precio de venta sería{' '}
              <strong style={{ color: 'var(--color-primary)' }}>
                ${((1000 * (1 + parseFloat(markupPercentage) / 100))).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </p>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 'var(--space-md)', paddingTop: 'var(--space-sm)' }}>
          <button onClick={handleClose} disabled={loading} style={cancelBtnStyle}>
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={!isValid || loading} style={submitBtnStyle(isValid && !loading)}>
            {loading ? 'Creando...' : 'Crear Regla'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '0.8rem',
  fontWeight: 600,
  color: 'var(--color-text-secondary)',
  display: 'block',
  marginBottom: 'var(--space-xs)',
};

const inputStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '1rem',
  padding: 'var(--space-sm) var(--space-md)',
  border: '1.5px solid rgba(218, 193, 184, 0.4)',
  borderRadius: 'var(--radius-sm)',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  background: 'transparent',
  color: 'var(--color-text-primary)',
};

const cancelBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: 'var(--space-sm) var(--space-md)',
  borderRadius: 'var(--radius-sm)',
  border: '1.5px solid rgba(218, 193, 184, 0.4)',
  background: 'transparent',
  fontFamily: 'var(--font-body)',
  fontSize: '0.9rem',
  fontWeight: 600,
  color: 'var(--color-text-secondary)',
  cursor: 'pointer',
};

const submitBtnStyle = (enabled: boolean): React.CSSProperties => ({
  flex: 1,
  padding: 'var(--space-sm) var(--space-md)',
  borderRadius: 'var(--radius-sm)',
  border: 'none',
  background: enabled ? 'var(--color-primary)' : 'rgba(188, 108, 37, 0.3)',
  fontFamily: 'var(--font-body)',
  fontSize: '0.9rem',
  fontWeight: 600,
  color: 'var(--color-on-primary)',
  cursor: enabled ? 'pointer' : 'default',
});
