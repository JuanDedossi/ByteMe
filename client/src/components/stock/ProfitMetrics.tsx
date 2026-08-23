import type { SaleStats } from '../../types/sale.types';

interface ProfitMetricsProps {
  stats: SaleStats;
}

export function ProfitMetrics({ stats }: ProfitMetricsProps) {
  const fmt = (v: number) =>
    `$${v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr 1fr',
        gap: 'var(--space-md)',
      }}
    >
      <MetricCard label="Ganancia semanal" value={fmt(stats.weekly)} accent="success" />
      <MetricCard label="Ganancia mensual" value={fmt(stats.monthly)} accent="success" />
      <MetricCard label="Ganancia neta semanal" value={fmt(stats.weeklyProfit)} accent="secondary" />
      <MetricCard label="Ganancia neta mensual" value={fmt(stats.monthlyProfit)} accent="secondary" />
    </div>
  );
}

function MetricCard({
  label,
  value,
  accent = 'success',
}: {
  label: string;
  value: string;
  accent?: 'success' | 'secondary';
}) {
  const valueColor = accent === 'secondary' ? 'var(--color-tertiary)' : 'var(--color-success)';

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
        borderLeft: accent === 'secondary' ? '4px solid var(--color-tertiary)' : '4px solid transparent',
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
          fontFamily: 'var(--font-body)',
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
