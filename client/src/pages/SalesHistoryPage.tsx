import { useState, useEffect, useCallback } from 'react';
import { SaleHistoryCard } from '../components/sales/SaleHistoryCard';
import { Pagination } from '../components/common/Pagination';
import { DateRangeFilter } from '../components/common/DateRangeFilter';
import { MetricCard } from '../components/common/MetricCard';
import { salesService } from '../services/sales.service';
import type { Sale, SaleSummary } from '../types/sale.types';
import { getPresetDates, type Preset } from '../utils/datePresets';
import axios from 'axios';

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

  const handleLineError = (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.error ?? error.response?.data?.message;
      if (typeof message === 'string') {
        setSummaryError(message);
        return;
      }
    }
    setSummaryError('No se pudo actualizar la línea');
  };

  const handleLineDelete = async (itemId: string, saleId: string) => {
    try {
      await salesService.removeLine(saleId, itemId);
      await fetchSales();
      await fetchSummary();
    } catch (error) {
      handleLineError(error);
    }
  };

  const handleLineUpdate = async (
    itemId: string,
    quantity: number,
    currentQty: number,
    saleId: string,
  ) => {
    try {
      await salesService.updateLineQuantity(saleId, itemId, quantity, currentQty);
      await fetchSales();
      await fetchSummary();
    } catch (error) {
      handleLineError(error);
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        await fetchSales();
      }
    }
  };

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

        <DateRangeFilter
          preset={preset}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onPreset={handlePreset}
          onDateChange={handleDateChange}
        />
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
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 'var(--space-md)',
            }}
          >
            {summaryLoading ? (
              <>
                <MetricCard label="Cantidad" value="Cargando..." accent="neutral" />
                <MetricCard label="Total" value="Cargando..." accent="success" />
                <MetricCard label="Ganancia" value="Cargando..." accent="secondary" />
              </>
            ) : summary ? (
              <>
                <MetricCard label="Cantidad items" value={String(summary.totalQuantity)} accent="neutral" />
                <MetricCard label="Total" value={fmt(summary.totalAmount)} accent="success" />
                <MetricCard label="Ganancia" value={fmt(summary.profit)} accent="secondary" />
              </>
            ) : (
              <>
                <MetricCard label="Cantidad" value="—" accent="neutral" />
                <MetricCard label="Total" value="—" accent="success" />
                <MetricCard label="Ganancia" value="—" accent="secondary" />
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
              <SaleHistoryCard
                key={sale._id}
                sale={sale}
                onLineDelete={(itemId) => handleLineDelete(itemId, sale._id)}
                onLineUpdate={(itemId, quantity, currentQty) =>
                  handleLineUpdate(itemId, quantity, currentQty, sale._id)
                }
              />
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
