import { useState, useRef, useEffect, type CSSProperties, type KeyboardEvent } from 'react';

interface InlinePriceEditProps {
  value: number;
  onSave: (newValue: number) => Promise<void>;
  disabled?: boolean;
  /** Show a small "/kg" line below when the price is per-100g. */
  suffix?: string;
}

export function InlinePriceEdit({ value, onSave, disabled, suffix }: InlinePriceEditProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const fmt = (v: number) =>
    `$${v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const startEdit = () => {
    if (disabled || saving) return;
    setDraft(String(value));
    setError(null);
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setDraft('');
    setError(null);
  };

  const submit = async () => {
    const parsed = parseFloat(draft);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Precio inválido');
      return;
    }
    if (parsed === value) {
      cancel();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(parsed);
      setEditing(false);
      setDraft('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void submit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    }
  };

  const displayStyle: CSSProperties = {
    fontFamily: 'var(--font-body)',
    fontSize: '0.85rem',
    fontWeight: 700,
    color: 'var(--color-primary)',
    margin: 'var(--space-xs) 0 0',
    padding: '2px 6px',
    marginLeft: '-6px',
    borderRadius: 'var(--radius-sm)',
    cursor: disabled || saving ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    transition: 'background 0.15s',
    display: 'inline-block',
  };

  if (editing) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: 'var(--space-xs)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.85rem',
              fontWeight: 700,
              color: 'var(--color-text-secondary)',
            }}
          >
            $
          </span>
          <input
            ref={inputRef}
            type="number"
            step="0.01"
            min="0"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => void submit()}
            disabled={saving}
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.95rem',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              padding: '4px 8px',
              borderRadius: 'var(--radius-sm)',
              border: error
                ? '1.5px solid var(--color-error)'
                : '1.5px solid var(--color-primary)',
              background: 'var(--color-surface)',
              width: '100px',
              outline: 'none',
            }}
          />
        </div>
        {error && (
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.7rem',
              color: 'var(--color-error)',
            }}
          >
            {error}
          </span>
        )}
        {suffix && !error && (
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.7rem',
              color: 'var(--color-text-secondary)',
            }}
          >
            {suffix}
          </span>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <span
        onClick={startEdit}
        title="Click para editar precio"
        style={displayStyle}
        onMouseEnter={(e) => {
          if (!disabled && !saving) {
            e.currentTarget.style.background = 'rgba(188, 108, 37, 0.08)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
      >
        {fmt(value)}
      </span>
      {suffix && (
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.7rem',
            color: 'var(--color-text-secondary)',
            margin: 0,
          }}
        >
          {suffix}
        </span>
      )}
    </div>
  );
}