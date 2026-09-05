import { useCallback, useEffect, useState } from 'react';
import { DateRangeFilter } from '../components/common/DateRangeFilter';
import { MetricCard } from '../components/common/MetricCard';
import { salesService } from '../services/sales.service';
import type { BreakdownItem, BreakdownSortBy, SaleSummary } from '../types/sale.types';
import { getPresetDates, type Preset } from '../utils/datePresets';

const PAGE_SIZE = 10;

function formatMoney(value: number) {
  return `$${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function AnalyticsPage() {
  const [preset, setPreset] = useState<Preset>('today');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [summary, setSummary] = useState<SaleSummary | null>(null);
  const [breakdown, setBreakdown] = useState<BreakdownItem[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [sortBy, setSortBy] = useState<BreakdownSortBy>('quantity');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getRange = useCallback(() => {
    if (preset !== 'all') return getPresetDates(preset);
    return { ...(dateFrom ? { dateFrom } : {}), ...(dateTo ? { dateTo } : {}) };
  }, [preset, dateFrom, dateTo]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setOffset(0);
    const range = getRange();
    const [summaryResult, breakdownResult] = await Promise.allSettled([
      salesService.getSummary(range),
      salesService.getBreakdown({ ...range, limit: PAGE_SIZE, offset: 0, sortBy }),
    ]);
    const errors: string[] = [];
    if (summaryResult.status === 'fulfilled') setSummary(summaryResult.value);
    else errors.push('No se pudo cargar el resumen.');
    if (breakdownResult.status === 'fulfilled') {
      setBreakdown(breakdownResult.value.items);
      setTotal(breakdownResult.value.total);
    } else {
      setBreakdown([]);
      setTotal(0);
      errors.push('No se pudo cargar más productos.');
    }
    setError(errors.length ? errors.join(' ') : null);
    setLoading(false);
  }, [getRange, sortBy]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const handlePreset = (nextPreset: Preset) => {
    setPreset(nextPreset);
    setDateFrom('');
    setDateTo('');
  };

  const handleDateChange = (field: 'from' | 'to', value: string) => {
    setPreset('all');
    if (field === 'from') setDateFrom(value);
    else setDateTo(value);
  };

  const handleSortChange = (next: BreakdownSortBy) => {
    setSortBy(next);
    setOffset(0);
  };

  const loadMore = async () => {
    const nextOffset = offset + PAGE_SIZE;
    setLoadingMore(true);
    try {
      const result = await salesService.getBreakdown({ ...getRange(), limit: PAGE_SIZE, offset: nextOffset, sortBy });
      setBreakdown((current) => [...current, ...result.items]);
      setTotal(result.total);
      setOffset(nextOffset);
    } catch {
      setError('No se pudo cargar más productos.');
    } finally {
      setLoadingMore(false);
    }
  };

  const canLoadMore = offset + breakdown.length < total;

  return (
    <div style={{ paddingBottom: '100px' }}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>Analítica</h1>
        <DateRangeFilter preset={preset} dateFrom={dateFrom} dateTo={dateTo} onPreset={handlePreset} onDateChange={handleDateChange} />
      </div>
      <div style={contentStyle}>
        <div style={cardsStyle}>
          <MetricCard
            label="Ganancia"
            value={summary ? formatMoney(summary.totalAmount) : loading ? 'Cargando...' : '$0,00'}
            accent="success"
          />
          <MetricCard
            label="Ganancia neta"
            value={summary ? formatMoney(summary.profit) : loading ? 'Cargando...' : '$0,00'}
            accent="secondary"
          />
          <MetricCard
            label="Costo total"
            value={summary ? formatMoney(summary.totalCost) : loading ? 'Cargando...' : '$0,00'}
            accent="error"
          />
        </div>
        {error && <p style={errorStyle}>{error}</p>}
        {!loading && breakdown.length > 0 && (
          <div style={sortRowStyle}>
            <label htmlFor="breakdown-sort" style={sortLabelStyle}>Ordenar por:</label>
            <select
              id="breakdown-sort"
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value as BreakdownSortBy)}
              style={sortSelectStyle}
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        )}
        {loading ? <div style={stateStyle}>Cargando...</div> : breakdown.length === 0 ? <div style={stateStyle}>No hay ventas en este período.</div> : (
          <div style={tableCardStyle}>
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead><tr>{columns.map((col) => <th key={col.heading} style={{ ...tableHeadingStyle, textAlign: col.align }}>{col.heading}</th>)}</tr></thead>
                <tbody>{breakdown.map((item, index) => (
                  <tr key={`${item.type}-${item.name}`} style={index % 2 === 0 ? tableRowEvenStyle : tableRowOddStyle}>
                    <td style={{ ...tableCellStyle, textAlign: 'left' }}>{item.type === 'recipe' ? 'receta' : 'bandeja'}</td>
                    <td style={{ ...tableCellStyle, textAlign: 'left' }}>{item.name}</td>
                    <td style={{ ...tableCellStyle, textAlign: 'right' }}>{item.quantity}</td>
                    <td style={{ ...tableCellStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatMoney(item.revenue)}</td>
                    <td style={{ ...tableCellStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: item.profit >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}>{formatMoney(item.profit)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            {canLoadMore && <button type="button" onClick={() => void loadMore()} disabled={loadingMore} style={loadMoreStyle}>{loadingMore ? 'Cargando...' : 'Ver más'}</button>}
          </div>
        )}
      </div>
    </div>
  );
}

const headerStyle = { background: 'var(--color-secondary)', padding: 'var(--space-xl) var(--space-lg) var(--space-lg)', paddingTop: 'calc(var(--space-xl) + env(safe-area-inset-top))' };
const titleStyle = { fontFamily: 'var(--font-headline)', fontSize: '1.75rem', color: 'var(--color-on-primary)', margin: '0 0 var(--space-md)' };
const contentStyle = { padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column' as const, gap: 'var(--space-md)' };
const cardsStyle = { background: 'var(--color-surface-container-low)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-md)' };
const tableCardStyle = { background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)', padding: 'var(--space-sm)' };
const tableStyle = { width: '100%' as const, borderCollapse: 'collapse' as const, minWidth: '540px', fontFamily: 'var(--font-body)' };
const columns: { heading: string; align: 'left' | 'right' }[] = [
  { heading: 'Tipo', align: 'left' },
  { heading: 'Producto', align: 'left' },
  { heading: 'Cantidad', align: 'right' },
  { heading: 'Ingreso', align: 'right' },
  { heading: 'Ganancia', align: 'right' },
];

const sortOptions: { value: BreakdownSortBy; label: string }[] = [
  { value: 'quantity', label: 'Más unidades vendidas' },
  { value: 'profit', label: 'Mayor ganancia' },
  { value: 'name', label: 'Nombre A-Z' },
  { value: 'lastSoldAt', label: 'Último vendido' },
];

const tableHeadingStyle = { fontFamily: 'var(--font-body)', fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', padding: 'var(--space-sm) var(--space-md)', background: 'var(--color-surface-container-low)', borderBottom: '2px solid var(--color-text-secondary)' };
const tableRowEvenStyle = { background: 'var(--color-surface)' };
const tableRowOddStyle = { background: 'var(--color-surface-container-low)' };
const tableCellStyle = { fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--color-text-primary)', padding: 'var(--space-sm) var(--space-md)', borderBottom: '1px solid rgba(0, 0, 0, 0.12)' };
const stateStyle = { textAlign: 'center' as const, padding: 'var(--space-2xl)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' };
const errorStyle = { margin: 0, color: 'var(--color-warning)', fontFamily: 'var(--font-body)', fontSize: '0.8rem' };
const loadMoreStyle = { display: 'block', margin: 'var(--space-md) auto 0', padding: 'var(--space-sm) var(--space-lg)', border: 'none', borderRadius: 'var(--radius-full)', background: 'var(--color-primary)', color: 'var(--color-on-primary)', fontFamily: 'var(--font-body)', fontWeight: 600, cursor: 'pointer' };
const sortRowStyle = { display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 'var(--space-sm)' };
const sortLabelStyle = { fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--color-text-secondary)' };
const sortSelectStyle = { fontFamily: 'var(--font-body)', fontSize: '0.85rem', padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1.5px solid rgba(218, 193, 184, 0.5)', background: 'var(--color-surface)', color: 'var(--color-text-primary)', cursor: 'pointer', outline: 'none' };
