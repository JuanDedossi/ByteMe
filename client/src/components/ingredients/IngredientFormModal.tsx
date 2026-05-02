import { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import type { Ingredient, UpdateIngredientPayload } from '../../types/ingredient.types';

interface IngredientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: UpdateIngredientPayload) => Promise<void>;
  initialData?: Ingredient | null;
}

export function IngredientFormModal({ isOpen, onClose, onSubmit, initialData }: IngredientFormModalProps) {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState<'kg' | 'unidad'>('kg');
  const [cost, setCost] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && initialData) {
      setName(initialData.name);
      setUnit(initialData.unit as 'kg' | 'unidad');
      setCost(initialData.unit === 'kg' ? initialData.costPerKg.toString() : initialData.costPerUnit.toString());
      setError('');
    } else if (!isOpen) {
      setName('');
      setUnit('kg');
      setCost('');
      setError('');
    }
  }, [isOpen, initialData]);

  const isValid = name.trim().length > 0 && parseFloat(cost) >= 0;

  const handleSubmit = async () => {
    if (!isValid) return;
    setLoading(true);
    setError('');
    try {
      const costNum = parseFloat(cost);
      const payload: UpdateIngredientPayload = { name: name.trim(), unit };
      if (unit === 'kg') {
        payload.costPerKg = costNum;
        payload.costPer100g = costNum / 10;
      } else {
        payload.costPerUnit = costNum;
      }
      await onSubmit(payload);
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar Ingrediente">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        <div>
          <label style={labelStyle}>Nombre</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
            autoFocus
          />
        </div>

        <div>
          <label style={labelStyle}>Unidad de medida</label>
          <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
            {(['kg', 'unidad'] as const).map((u) => (
              <button
                key={u}
                onClick={() => setUnit(u)}
                style={{
                  flex: 1,
                  padding: 'var(--space-sm)',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  background: unit === u ? 'var(--color-primary)' : '#f2efd5',
                  color: unit === u ? 'var(--color-on-primary)' : 'var(--color-text-secondary)',
                  transition: 'all 0.2s',
                }}
              >
                {u === 'kg' ? 'Por peso (kg)' : 'Por unidad'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={labelStyle}>Costo por {unit === 'kg' ? 'kg' : 'unidad'}</label>
          <div style={{ position: 'relative' }}>
            <span style={prefixStyle}>$</span>
            <input
              type="number"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              min="0"
              style={{ ...inputStyle, paddingLeft: '2rem' }}
            />
          </div>
        </div>

        {error && <p style={{ color: 'var(--color-error)', margin: 0, fontSize: '0.85rem' }}>{error}</p>}

        <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-xs)' }}>
          <button onClick={onClose} disabled={loading} style={cancelBtnStyle}>Cancelar</button>
          <button onClick={handleSubmit} disabled={loading || !isValid} style={submitBtnStyle(loading || !isValid)}>
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'var(--font-body)',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'var(--color-text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: 'var(--space-xs)',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: 'var(--space-sm) var(--space-md)',
  fontFamily: 'var(--font-body)',
  fontSize: '0.95rem',
  color: 'var(--color-text-primary)',
  background: '#f2efd5',
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  outline: 'none',
  boxSizing: 'border-box',
};

const prefixStyle: React.CSSProperties = {
  position: 'absolute',
  left: 'var(--space-md)',
  top: '50%',
  transform: 'translateY(-50%)',
  fontFamily: 'var(--font-body)',
  fontSize: '0.85rem',
  color: 'var(--color-text-secondary)',
  pointerEvents: 'none',
};

const cancelBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: 'var(--space-md)',
  borderRadius: 'var(--radius-md)',
  border: '1.5px solid #dac1b8',
  background: 'transparent',
  fontFamily: 'var(--font-body)',
  fontSize: '0.95rem',
  fontWeight: 600,
  color: 'var(--color-text-secondary)',
  cursor: 'pointer',
};

const submitBtnStyle = (disabled: boolean): React.CSSProperties => ({
  flex: 2,
  padding: 'var(--space-md)',
  borderRadius: 'var(--radius-md)',
  border: 'none',
  background: disabled ? '#e0d5c8' : 'var(--color-primary)',
  fontFamily: 'var(--font-body)',
  fontSize: '0.95rem',
  fontWeight: 600,
  color: disabled ? '#aaa' : 'var(--color-on-primary)',
  cursor: disabled ? 'not-allowed' : 'pointer',
  transition: 'background 0.2s',
});
