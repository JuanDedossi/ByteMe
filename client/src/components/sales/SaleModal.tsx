import { useState, useEffect } from 'react';
import { MdAdd, MdRemove } from 'react-icons/md';
import { Modal } from '../common/Modal';
import { recipesService } from '../../services/recipes.service';
import { traysService } from '../../services/trays.service';
import type { Recipe } from '../../types/recipe.types';
import type { Tray } from '../../types/tray.types';
import type { CreateSalePayload } from '../../types/sale.types';

interface SellableItem {
  id: string;
  type: 'recipe' | 'tray';
  name: string;
  sellUnit: string;
  price: number;
  pricePerKg: number;
  stock: number;
}

interface SaleItemState {
  id: string;
  itemType: 'recipe' | 'tray';
  quantity: number;
  weightInput: string;
  selected: boolean;
}

interface SaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateSalePayload) => Promise<void>;
  preSelectedId?: string;
  preSelectedType?: 'recipe' | 'tray';
}

function buildSellableItems(recipes: Recipe[], trays: Tray[]): SellableItem[] {
  const recipeItems: SellableItem[] = recipes.map((r) => ({
    id: r._id,
    type: 'recipe' as const,
    name: r.name,
    sellUnit: r.sellUnit,
    price: r.sellingPrice,
    pricePerKg: r.pricePerKg,
    stock: r.stock,
  }));
  const trayItems: SellableItem[] = trays.map((t) => ({
    id: t._id,
    type: 'tray' as const,
    name: t.name,
    sellUnit: 'unidad',
    price: t.sellingPrice,
    pricePerKg: 0,
    stock: t.stock,
  }));
  return [...recipeItems, ...trayItems];
}

export function SaleModal({ isOpen, onClose, onSubmit, preSelectedId, preSelectedType }: SaleModalProps) {
  const [sellableItems, setSellableItems] = useState<SellableItem[]>([]);
  const [items, setItems] = useState<SaleItemState[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setError('');
      setSellableItems([]);
      setItems([]);
      return;
    }

    let cancelled = false;

    async function fetchItems() {
      setFetching(true);
      try {
        const [recipesRes, traysRes] = await Promise.all([
          recipesService.list({ limit: 500, hasStock: true }),
          traysService.list({ limit: 500, hasStock: true }),
        ]);
        if (cancelled) return;

        const allItems = buildSellableItems(recipesRes.data, traysRes.data);
        setSellableItems(allItems);
        setItems(
          allItems.map((item) => ({
            id: item.id,
            itemType: item.type,
            quantity: item.sellUnit === 'kg' ? 0 : 1,
            weightInput: '',
            selected: item.id === preSelectedId && (preSelectedType ? item.type === preSelectedType : true),
          })),
        );
      } finally {
        if (!cancelled) setFetching(false);
      }
    }

    void fetchItems();

    return () => {
      cancelled = true;
    };
  }, [isOpen, preSelectedId, preSelectedType]);

  const getItem = (id: string) => sellableItems.find((i) => i.id === id);

  const toggleSelect = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item)),
    );
  };

  const changeQuantity = (id: string, delta: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const sellable = getItem(id);
        const max = sellable?.stock ?? 1;
        const next = Math.max(1, Math.min(max, item.quantity + delta));
        return { ...item, quantity: next };
      }),
    );
  };

  const changeWeight = (id: string, value: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const sellable = getItem(id);
        const max = sellable?.stock ?? 0;
        const parsed = parseFloat(value);
        const qty = isNaN(parsed) ? 0 : Math.min(parsed, max);
        return { ...item, weightInput: value, quantity: Math.max(0, qty) };
      }),
    );
  };

  const selectedItems = items.filter((i) => i.selected && i.quantity > 0);

  const fmt = (v: number) =>
    `$${v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const total = selectedItems.reduce((sum, item) => {
    const sellable = getItem(item.id);
    if (!sellable) return sum;
    if (sellable.sellUnit === 'kg') {
      return sum + (item.quantity / 1000) * sellable.pricePerKg;
    }
    return sum + sellable.price * item.quantity;
  }, 0);

  const isValid = selectedItems.length > 0;

  const handleSubmit = async () => {
    if (!isValid) return;
    setError('');
    setLoading(true);
    try {
      const payload: CreateSalePayload = {
        items: selectedItems.map((i) => {
          if (i.itemType === 'tray') {
            return { trayId: i.id, quantity: i.quantity };
          }
          return { recipeId: i.id, quantity: i.quantity };
        }),
      };
      await onSubmit(payload);
      onClose();
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : 'Error al registrar la venta.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registrar Venta">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {fetching ? (
          <p style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-secondary)', textAlign: 'center', padding: 'var(--space-lg) 0' }}>
            Cargando productos...
          </p>
        ) : sellableItems.length === 0 ? (
          <p style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-secondary)', textAlign: 'center', padding: 'var(--space-lg) 0' }}>
            No hay productos con stock disponible.
          </p>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', maxHeight: '50vh', overflowY: 'auto' }}>
              {items.map((item) => {
                const sellable = getItem(item.id);
                if (!sellable) return null;
                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-sm)',
                      padding: 'var(--space-sm) var(--space-md)',
                      borderRadius: 'var(--radius-sm)',
                      background: item.selected ? 'var(--color-surface-container-low)' : 'transparent',
                      border: `1.5px solid ${item.selected ? 'rgba(188, 108, 37, 0.3)' : 'rgba(218, 193, 184, 0.25)'}`,
                      cursor: 'pointer',
                    }}
                    onClick={() => toggleSelect(item.id)}
                  >
                    {/* Checkbox */}
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 4,
                        border: `2px solid ${item.selected ? 'var(--color-primary)' : 'rgba(218, 193, 184, 0.6)'}`,
                        background: item.selected ? 'var(--color-primary)' : 'transparent',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {item.selected && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>

                    {/* Item info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', fontWeight: 600, margin: 0, color: 'var(--color-text-primary)' }}>
                          {sellable.name}
                        </p>
                        {sellable.type === 'tray' && (
                          <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.6rem', color: 'var(--color-text-secondary)', background: 'rgba(218, 193, 184, 0.2)', padding: '1px 5px', borderRadius: 'var(--radius-sm)', flexShrink: 0 }}>
                            Bandeja
                          </span>
                        )}
                      </div>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: '2px 0 0' }}>
                        {sellable.sellUnit === 'kg' ? `${fmt(sellable.pricePerKg)}/kg` : fmt(sellable.price)} · stock: {sellable.sellUnit === 'kg' ? (sellable.stock >= 1000 ? `${(sellable.stock / 1000).toFixed(1)}kg` : `${sellable.stock}g`) : sellable.stock}
                      </p>
                    </div>

                    {/* Quantity stepper or weight input (only when selected) */}
                    {item.selected && (
                      sellable.sellUnit === 'kg' ? (
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="number"
                            value={item.weightInput}
                            onChange={(e) => changeWeight(item.id, e.target.value)}
                            placeholder="g"
                            min="0"
                            max={sellable.stock}
                            style={{
                              width: 60,
                              fontFamily: 'var(--font-body)',
                              fontSize: '0.85rem',
                              textAlign: 'center',
                              border: '1.5px solid rgba(218, 193, 184, 0.4)',
                              borderRadius: 'var(--radius-sm)',
                              padding: '2px 4px',
                              background: 'transparent',
                              color: 'var(--color-text-primary)',
                              outline: 'none',
                            }}
                          />
                          <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>g</span>
                        </div>
                      ) : (
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => changeQuantity(item.id, -1)}
                            disabled={item.quantity <= 1}
                            style={stepperBtn}
                          >
                            <MdRemove size={14} />
                          </button>
                          <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', fontWeight: 600, minWidth: 20, textAlign: 'center', color: 'var(--color-text-primary)' }}>
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => changeQuantity(item.id, 1)}
                            disabled={item.quantity >= sellable.stock}
                            style={stepperBtn}
                          >
                            <MdAdd size={14} />
                          </button>
                        </div>
                      )
                    )}

                    {/* Subtotal */}
                    {item.selected && item.quantity > 0 && (
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary)', minWidth: 70, textAlign: 'right', flexShrink: 0 }}>
                        {fmt(sellable.sellUnit === 'kg' ? (item.quantity / 1000) * sellable.pricePerKg : sellable.price * item.quantity)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            {selectedItems.length > 0 && (
              <div style={{ background: 'var(--color-surface-container-low)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {selectedItems.map((item) => {
                  const sellable = getItem(item.id);
                  if (!sellable) return null;
                  return (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                        {sellable.sellUnit === 'kg' ? `${item.quantity}g` : `${item.quantity}×`} {sellable.name}
                        {sellable.type === 'tray' ? ' (B)' : ''}
                      </span>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                        {fmt(sellable.sellUnit === 'kg' ? (item.quantity / 1000) * sellable.pricePerKg : sellable.price * item.quantity)}
                      </span>
                    </div>
                  );
                })}
                <div style={{ borderTop: '1px solid rgba(218, 193, 184, 0.3)', marginTop: 'var(--space-xs)', paddingTop: 'var(--space-xs)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>Total</span>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-primary)' }}>{fmt(total)}</span>
                </div>
              </div>
            )}
          </>
        )}

        {error && (
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--color-error)', margin: 0 }}>
            {error}
          </p>
        )}

        <div style={{ display: 'flex', gap: 'var(--space-md)', paddingTop: 'var(--space-xs)' }}>
          <button onClick={onClose} disabled={loading} style={cancelBtnStyle}>
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid || loading || fetching}
            style={submitBtnStyle(!isValid || loading || fetching)}
          >
            {loading ? 'Registrando...' : 'Confirmar Venta'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

const stepperBtn: React.CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: 'var(--radius-sm)',
  border: '1.5px solid rgba(218, 193, 184, 0.4)',
  background: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--color-text-secondary)',
  padding: 0,
};

const cancelBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: 'var(--space-sm)',
  borderRadius: 'var(--radius-sm)',
  border: '1.5px solid rgba(218, 193, 184, 0.4)',
  background: 'transparent',
  fontFamily: 'var(--font-body)',
  fontSize: '0.9rem',
  fontWeight: 600,
  color: 'var(--color-text-secondary)',
  cursor: 'pointer',
};

const submitBtnStyle = (disabled: boolean): React.CSSProperties => ({
  flex: 1,
  padding: 'var(--space-sm)',
  borderRadius: 'var(--radius-sm)',
  border: 'none',
  background: disabled ? 'rgba(188, 108, 37, 0.3)' : 'var(--color-primary)',
  fontFamily: 'var(--font-body)',
  fontSize: '0.9rem',
  fontWeight: 600,
  color: 'var(--color-on-primary)',
  cursor: disabled ? 'default' : 'pointer',
});
