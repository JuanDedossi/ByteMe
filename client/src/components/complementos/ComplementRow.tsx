import { MdEdit, MdDelete, MdToggleOn, MdToggleOff } from 'react-icons/md';
import type { Complement } from '../../types/complement.types';

interface ComplementRowProps {
  complement: Complement;
  onEdit: (complement: Complement) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string) => void;
}

const formatCurrency = (value: number) =>
  `$${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function ComplementRow({ complement, onEdit, onDelete, onToggleActive }: ComplementRowProps) {
  // P4 foundation: disambiguating label format
  const label = `${complement.name} (${complement.unit})`;

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
        opacity: complement.isActive ? 1 : 0.6,
      }}
    >
      {/* Header row: name + actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '1rem',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
            }}
          >
            {label}
          </span>
          {!complement.isActive && (
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.65rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                background: 'var(--color-warning)',
                color: 'var(--color-on-primary)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
              }}
            >
              Inactivo
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-xs)', flexShrink: 0 }}>
          <button
            onClick={() => onToggleActive(complement._id)}
            style={iconBtnStyle(complement.isActive ? 'var(--color-success)' : 'var(--color-text-secondary)')}
            title={complement.isActive ? 'Desactivar' : 'Activar'}
            aria-label={complement.isActive ? 'Desactivar complemento' : 'Activar complemento'}
          >
            {complement.isActive ? <MdToggleOn size={20} /> : <MdToggleOff size={20} />}
          </button>
          <button
            onClick={() => onEdit(complement)}
            style={iconBtnStyle('var(--color-secondary)')}
            title="Editar"
            aria-label="Editar complemento"
          >
            <MdEdit size={18} />
          </button>
          <button
            onClick={() => onDelete(complement._id)}
            style={iconBtnStyle('var(--color-error)')}
            title="Eliminar"
            aria-label="Eliminar complemento"
          >
            <MdDelete size={18} />
          </button>
        </div>
      </div>

      {/* Cost row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)', flexWrap: 'wrap' }}>
        <div>
          <span style={labelStyle}>
            Costo por {complement.unit === 'metro' ? 'metro' : 'unidad'}
          </span>
          <p style={valueStyle}>{formatCurrency(complement.costPerUnit)}</p>
        </div>

        {/* P3: usage badge "Usado en N recetas" */}
        <div>
          <span style={labelStyle}>Uso</span>
          <p
            style={{
              ...valueStyle,
              fontSize: '0.85rem',
              color:
                complement.usageCount > 0
                  ? 'var(--color-text-primary)'
                  : 'var(--color-text-secondary)',
              fontWeight: complement.usageCount > 0 ? 600 : 400,
            }}
          >
            {complement.usageCount > 0
              ? `Usado en ${complement.usageCount} ${complement.usageCount === 1 ? 'receta o bandeja' : 'recetas y/o bandejas'}`
              : 'Sin uso'}
          </p>
        </div>
      </div>
    </div>
  );
}

const iconBtnStyle = (color: string): React.CSSProperties => ({
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color,
  display: 'flex',
  alignItems: 'center',
  padding: 'var(--space-xs)',
  borderRadius: 'var(--radius-sm)',
});

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '0.7rem',
  color: 'var(--color-text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  display: 'block',
};

const valueStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '1rem',
  fontWeight: 600,
  color: 'var(--color-primary)',
  margin: '2px 0 0',
};
