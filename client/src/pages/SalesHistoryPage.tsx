import { useState, useEffect, useCallback } from 'react';
import { SaleHistoryCard } from '../components/sales/SaleHistoryCard';
import { Pagination } from '../components/common/Pagination';
import { salesService } from '../services/sales.service';
import type { Sale, SaleSummary } from '../types/sale.types';

type Preset = 'today' | 'week' | 'month' | 'all';

function getPresetDates(preset: Preset): { dateFrom?: string; dateTo?: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const toDateStr = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (preset === 'today') {
    const today = toDateStr(now);
    return { dateFrom: today, dateTo: today };
  }
  if (preset === 'week') {
    const day = now.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    const from = new Date(now);
    from.setDate(now.getDate() - diffToMonday);
    return { dateFrom: toDateStr(from), dateTo: toDateStr(now) };
  }
  if (preset === 'month') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { dateFrom: toDateStr(from), dateTo: toDateStr(now) };
  }
  return {};
}

function fmt(v: number) {
  return `$${v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function SalesHistoryPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [preset, setPreset] = useState<Preset>('month');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [summary, setSummary] = useState<SaleSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const limit = 20;

  const fetchSales = useCallback(async () => {
    setLoading(true);
    try {
      const params: { page: number; limit: number; dateFrom?: string; dateTo?: string } = {
        page,
        limit,
      };
      if (preset !== 'all') {
        const presetDates = getPresetDates(preset);
        params.dateFrom = presetDates.dateFrom;
        params.dateTo = presetDates.dateTo;
      } else {
        if (dateFrom) params.dateFrom = dateFrom;
        if (dateTo) params.dateTo = dateTo;
      }
      const res = await salesService.list(params);
      setSales(res.data);
      setTotalPages(res.totalPages);
    } finally {
      setLoading(false);
    }
  }, [page, preset, dateFrom, dateTo]);

  useEffect(() => {
    void fetchSales();
  }, [fetchSales]);

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const params: { dateFrom?: string; dateTo?: string } = {};
      if (preset !== 'all') {
        const presetDates = getPresetDates(preset);
        if (presetDates.dateFrom) params.dateFrom = presetDates.dateFrom;
        if (presetDates.dateTo) params.dateTo = presetDates.dateTo;
      } else {
        if (dateFrom) params.dateFrom = dateFrom;
        if (dateTo) params.dateTo = dateTo;
      }
      const data = await salesService.getSummary(params);
      setSummary(data);
      setSummaryError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar el resumen';
      setSummaryError(message);
    } finally {
      setSummaryLoading(false);
    }
  }, [preset, dateFrom, dateTo]);

  useEffect(() => {
    void fetchSummary();
  }, [fetchSummary]);

  const handlePreset = (p: Preset) => {
    setPreset(p);
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const handleDateChange = (field: 'from' | 'to', value: string) => {
    setPreset('all');
    setPage(1);
    if (field === 'from') setDateFrom(value);
    else setDateTo(value);
  };

  const presets: { key: Preset; label: string }[] = [
    { key: 'today', label: 'Hoy' },
    { key: 'week', label: 'Esta semana' },
    { key: 'month', label: 'Este mes' },
    { key: 'all', label: 'Todo' },
  ];

  return (
    <div style={{ paddingBottom: '100px' }}>
      {/* Header */}
      <div
        style={{
          background: 'var(--color-secondary)',
          padding: 'var(--space-xl) var(--space-lg) var(--space-lg)',
          paddingTop: 'calc(var(--space-xl) + env(safe-area-inset-top))',
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-headline)',
            fontSize: '1.75rem',
            color: 'var(--color-on-primary)',
            margin: '0 0 var(--space-md)',
          }}
        >
          Historial de Ventas
        </h1>

        {/* Presets */}
        <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
          {presets.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handlePreset(key)}
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

        {/* Rango custom */}
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
            onChange={(e) => handleDateChange('from', e.target.value)}
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
            onChange={(e) => handleDateChange('to', e.target.value)}
            style={dateInputStyle}
          />
        </div>
      </div>

      {/* Contenido */}
      <div
        style={{
          padding: 'var(--space-lg)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-md)',
        }}
      >
        {/* Resumen del período */}
        <div
          style={{
            background: 'var(--color-surface-container-low)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-xs)',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 'var(--space-md)',
            }}
          >
            {summaryLoading ? (
              <>
                <SummaryCell label="Cantidad" value="Cargando..." />
                <SummaryCell label="Total" value="Cargando..." />
                <SummaryCell label="Ganancia" value="Cargando..." />
              </>
            ) : summary ? (
              <>
                <SummaryCell label="Cantidad" value={String(summary.count)} />
                <SummaryCell label="Total" value={fmt(summary.totalAmount)} />
                <SummaryCell label="Ganancia" value={fmt(summary.profit)} />
              </>
            ) : (
              <>
                <SummaryCell label="Cantidad" value="—" />
                <SummaryCell label="Total" value="—" />
                <SummaryCell label="Ganancia" value="—" />
              </>
            )}
          </div>
          {summaryError && (
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.7rem',
                color: 'var(--color-warning)',
                marginTop: '2px',
              }}
            >
              {summaryError}
            </span>
          )}
        </div>

        {/* Lista */}
        {loading ? (
          <div
            style={{
              textAlign: 'center',
              padding: 'var(--space-2xl)',
              color: 'var(--color-text-secondary)',
              fontFamily: 'var(--font-body)',
            }}
          >
            Cargando...
          </div>
        ) : sales.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: 'var(--space-2xl)',
              color: 'var(--color-text-secondary)',
              fontFamily: 'var(--font-body)',
            }}
          >
            No hay ventas en este período.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {sales.map((sale) => (
              <SaleHistoryCard key={sale._id} sale={sale} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        )}
      </div>
    </div>
  );
}

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
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
          color: 'var(--color-text-primary)',
        }}
      >
        {value}
      </span>
    </div>
  );
}

const dateInputStyle: React.CSSProperties = {
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
