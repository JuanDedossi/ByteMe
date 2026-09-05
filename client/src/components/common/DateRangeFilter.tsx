import type { CSSProperties } from 'react';
import { PRESETS, type Preset } from '../../utils/datePresets';

interface DateRangeFilterProps {
  preset: Preset;
  dateFrom: string;
  dateTo: string;
  onPreset: (preset: Preset) => void;
  onDateChange: (field: 'from' | 'to', value: string) => void;
}

export function DateRangeFilter({
  preset,
  dateFrom,
  dateTo,
  onPreset,
  onDateChange,
}: DateRangeFilterProps) {
  return (
    <>
      <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
        {PRESETS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onPreset(key)}
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.8rem',
              fontWeight: preset === key ? 600 : 400,
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              border: `1.5px solid ${preset === key ? 'var(--color-primary)' : 'rgba(218, 193, 184, 0.5)'}`,
              background: preset === key ? 'var(--color-primary)' : 'transparent',
              color: preset === key ? 'var(--color-on-primary)' : 'var(--color-text-secondary)',
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          gap: 'var(--space-sm)',
          marginTop: 'var(--space-sm)',
          alignItems: 'center',
        }}
      >
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => onDateChange('from', e.target.value)}
          style={dateInputStyle}
        />
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.8rem',
            color: 'var(--color-text-secondary)',
          }}
        >
          —
        </span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => onDateChange('to', e.target.value)}
          style={dateInputStyle}
        />
      </div>
    </>
  );
}

const dateInputStyle: CSSProperties = {
  flex: 1,
  fontFamily: 'var(--font-body)',
  fontSize: '0.8rem',
  padding: '6px 10px',
  borderRadius: 'var(--radius-sm)',
  border: '1.5px solid rgba(218, 193, 184, 0.4)',
  background: 'rgba(255,255,255,0.5)',
  color: 'var(--color-text-primary)',
  outline: 'none',
};
