interface MetricCardProps {
  label: string;
  value: string;
  accent?: 'success' | 'secondary' | 'error' | 'neutral';
}

export function MetricCard({ label, value, accent = 'success' }: MetricCardProps) {
  const valueColor =
    accent === 'secondary'
      ? 'var(--color-tertiary)'
      : accent === 'error'
        ? 'var(--color-error)'
        : accent === 'neutral'
          ? 'var(--color-text-primary)'
          : 'var(--color-success)';

  const borderLeftColor =
    accent === 'secondary'
      ? 'var(--color-tertiary)'
      : accent === 'error'
        ? 'var(--color-error)'
        : 'var(--color-success)';

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-sm)',
        padding: 'var(--space-md)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-xs)',
        borderLeft: `4px solid ${borderLeftColor}`,
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: '0.7rem',
          fontWeight: 600,
          color: 'var(--color-text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-headline)',
          fontSize: '1.1rem',
          fontWeight: 700,
          color: valueColor,
        }}
      >
        {value}
      </span>
    </div>
  );
}