import { useCallback, useEffect, useState } from 'react';
import { DateRangeFilter } from '../components/common/DateRangeFilter';
import { salesService } from '../services/sales.service';
import type { BreakdownItem, SaleSummary } from '../types/sale.types';
import { getPresetDates, type Preset } from '../utils/datePresets';

const PAGE_SIZE = 10;

function formatMoney(value: number) {
  return `$${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function AnalyticsPage() {
  const [preset, setPreset] = useState<Preset>('month');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [summary, setSummary] = useState<SaleSummary | null>(null);
  const [breakdown, setBreakdown] = useState<BreakdownItem[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
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
      salesService.getBreakdown({ ...range, limit: PAGE_SIZE, offset: 0 }),
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
      errors.push('No se pudo cargar el detalle de ventas.');
    }
    setError(errors.length ? errors.join(' ') : null);
    setLoading(false);
  }, [getRange]);

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

  const loadMore = async () => {
    const nextOffset = offset + PAGE_SIZE;
    setLoadingMore(true);
    try {
      const result = await salesService.getBreakdown({ ...getRange(), limit: PAGE_SIZE, offset: nextOffset });
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
          <SummaryCell label="Ganancia" value={summary ? formatMoney(summary.totalAmount) : loading ? 'Cargando...' : '$0,00'} />
          <SummaryCell label="Ganancia neta" value={summary ? formatMoney(summary.profit) : loading ? 'Cargando...' : '$0,00'} />
          <SummaryCell label="Costo total" value={summary ? formatMoney(summary.totalCost) : loading ? 'Cargando...' : '$0,00'} />
        </div>
        {error && <p style={errorStyle}>{error}</p>}
        {loading ? <div style={stateStyle}>Cargando...</div> : breakdown.length === 0 ? <div style={stateStyle}>No hay ventas en este período.</div> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '540px' }}>
              <thead><tr>{['Tipo', 'Producto', 'Cantidad', 'Ingreso', 'Ganancia'].map((heading) => <th key={heading} style={tableHeadingStyle}>{heading}</th>)}</tr></thead>
              <tbody>{breakdown.map((item) => (
                <tr key={`${item.type}-${item.name}`}>
                  <td style={tableCellStyle}>{item.type === 'recipe' ? 'receta' : 'bandeja'}</td>
                  <td style={tableCellStyle}>{item.name}</td>
                  <td style={tableCellStyle}>{item.quantity}</td>
                  <td style={tableCellStyle}>{formatMoney(item.revenue)}</td>
                  <td style={tableCellStyle}>{formatMoney(item.profit)}</td>
                </tr>
              ))}</tbody>
            </table>
            {canLoadMore && <button type="button" onClick={() => void loadMore()} disabled={loadingMore} style={loadMoreStyle}>{loadingMore ? 'Cargando...' : 'Ver más'}</button>}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCell({ label, value }: { label: string; value: string }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}><span style={labelStyle}>{label}</span><span style={valueStyle}>{value}</span></div>;
}

const headerStyle = { background: 'var(--color-secondary)', padding: 'var(--space-xl) var(--space-lg) var(--space-lg)', paddingTop: 'calc(var(--space-xl) + env(safe-area-inset-top))' };
const titleStyle = { fontFamily: 'var(--font-headline)', fontSize: '1.75rem', color: 'var(--color-on-primary)', margin: '0 0 var(--space-md)' };
const contentStyle = { padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column' as const, gap: 'var(--space-md)' };
const cardsStyle = { background: 'var(--color-surface-container-low)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-md)' };
const labelStyle = { fontFamily: 'var(--font-body)', fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' };
const valueStyle = { fontFamily: 'var(--font-headline)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)' };
const tableHeadingStyle = { ...labelStyle, textAlign: 'left' as const, padding: 'var(--space-sm)', borderBottom: '1px solid var(--color-outline-variant)' };
const tableCellStyle = { fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--color-text-primary)', padding: 'var(--space-sm)', borderBottom: '1px solid var(--color-outline-variant)' };
const stateStyle = { textAlign: 'center' as const, padding: 'var(--space-2xl)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' };
const errorStyle = { margin: 0, color: 'var(--color-warning)', fontFamily: 'var(--font-body)', fontSize: '0.8rem' };
const loadMoreStyle = { display: 'block', margin: 'var(--space-md) auto 0', padding: 'var(--space-sm) var(--space-lg)', border: 'none', borderRadius: 'var(--radius-full)', background: 'var(--color-primary)', color: 'var(--color-on-primary)', fontFamily: 'var(--font-body)', fontWeight: 600, cursor: 'pointer' };
