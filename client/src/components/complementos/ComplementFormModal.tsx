import { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import type {
  Complement,
  ComplementUnit,
  CreateComplementPayload,
  UpdateComplementPayload,
} from '../../types/complement.types';
import { COMPLEMENT_UNITS } from '../../types/complement.types';

interface ComplementFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    payload: CreateComplementPayload | UpdateComplementPayload,
  ) => Promise<void>;
  initialData?: Complement | null;
}

const unitLabel = (unit: ComplementUnit) =>
  unit === 'metro' ? 'Por metro' : 'Por unidad';

const unitShort = (unit: ComplementUnit) =>
  unit === 'metro' ? 'metro' : 'unidad';

export function ComplementFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: ComplementFormModalProps) {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState<ComplementUnit>('unidad');
  const [cost, setCost] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!initialData;

  useEffect(() => {
    if (isOpen && initialData) {
      setName(initialData.name);
      setUnit(initialData.unit);
      setCost(initialData.costPerUnit.toString());
      setError('');
    } else if (isOpen && !initialData) {
      setName('');
      setUnit('unidad');
      setCost('');
      setError('');
    } else {
      setName('');
      setUnit('unidad');
      setCost('');
      setError('');
    }
  }, [isOpen, initialData]);

  const costNum = parseFloat(cost);
  const isValid = name.trim().length > 0 && !isNaN(costNum) && costNum >= 0;

  const handleSubmit = async () => {
    if (!isValid) return;
    setLoading(true);
    setError('');
    try {
      await onSubmit({
        name: name.trim(),
        unit,
        costPerUnit: costNum,
      });
      onClose();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err?.response?.data?.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setUnit('unidad');
    setCost('');
    setError('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEdit ? 'Editar Complemento' : 'Nuevo Complemento'}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-md)',
        }}
      >
        {/* Name */}
        <div>
          <label style={labelStyle}>Nombre</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='Ej: "Bandeja cartón", "Tela decorativa"'
            style={inputStyle}
            autoFocus
          />
        </div>

        {/* Unit select */}
        <div>
          <label style={labelStyle}>Unidad de medida</label>
          <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
            {COMPLEMENT_UNITS.map((u) => (
              <button
                key={u}
                type="button"
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
                  color:
                    unit === u
                      ? 'var(--color-on-primary)'
                      : 'var(--color-text-secondary)',
                  transition: 'all 0.2s',
                }}
              >
                {unitLabel(u)}
              </button>
            ))}
          </div>
        </div>

        {/* Cost */}
        <div>
          <label style={labelStyle}>Costo por {unitShort(unit)}</label>
          <div style={{ position: 'relative' }}>
            <span style={prefixStyle}>$</span>
            <input
              type="number"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              min="0"
              step="0.01"
              style={{ ...inputStyle, paddingLeft: '2rem' }}
            />
          </div>
        </div>

        {error && (
          <p
            style={{
              color: 'var(--color-error)',
              margin: 0,
              fontSize: '0.85rem',
            }}
          >
            {error}
          </p>
        )}

        {/* Actions */}
        <div
          style={{
            display: 'flex',
            gap: 'var(--space-sm)',
            marginTop: 'var(--space-xs)',
          }}
        >
          <button
            onClick={handleClose}
            disabled={loading}
            style={cancelBtnStyle}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !isValid}
            style={submitBtnStyle(loading || !isValid)}
          >
            {loading
              ? 'Guardando...'
              : isEdit
                ? 'Guardar'
                : 'Crear Complemento'}
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
