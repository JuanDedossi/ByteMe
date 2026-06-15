import { useState, useEffect } from 'react';
import { MdAdd, MdClose } from 'react-icons/md';
import { Modal } from '../common/Modal';
import { SearchableSelect } from '../common/SearchableSelect';
import type { ProfitRule } from '../../types/profit-rule.types';
import type { Recipe } from '../../types/recipe.types';
import type { CreateTrayPayload, Tray } from '../../types/tray.types';

interface RecipeRow {
  id: number;
  recipeId: string;
  quantity: string;
}

interface TrayFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateTrayPayload) => Promise<void>;
  recipes: Recipe[];
  profitRules: ProfitRule[];
  initialData?: Tray | null;
}

let rowCounter = 0;

export function TrayFormModal({ isOpen, onClose, onSubmit, recipes, profitRules, initialData }: TrayFormModalProps) {
  const [name, setName] = useState('');
  const [rows, setRows] = useState<RecipeRow[]>([{ id: ++rowCounter, recipeId: '', quantity: '' }]);
  const [profitRuleId, setProfitRuleId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name);
        setProfitRuleId(initialData.profitRuleId);

        const rRows: RecipeRow[] = initialData.recipes.map((r) => ({
          id: ++rowCounter,
          recipeId: r.recipeId,
          quantity: r.quantity.toString(),
        }));

        if (rRows.length === 0) rRows.push({ id: ++rowCounter, recipeId: '', quantity: '' });

        setRows(rRows);
      } else {
        setName('');
        setRows([{ id: ++rowCounter, recipeId: '', quantity: '' }]);
        setProfitRuleId(profitRules[0]?._id ?? '');
      }
      setError('');
    }
  }, [isOpen, initialData, profitRules]);

  const fmt = (v: number) =>
    `$${v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const getRecipe = (id: string) => recipes.find((r) => r._id === id);
  const getRule = (id: string) => profitRules.find((r) => r._id === id);

  const validRows = rows.filter((r) => r.recipeId && parseFloat(r.quantity) > 0);

  const totalCost = validRows.reduce((sum, row) => {
    const recipe = getRecipe(row.recipeId);
    if (!recipe) return sum;
    const q = parseFloat(row.quantity);
    if (recipe.sellUnit === 'kg' && recipe.yieldGrams > 0) {
      return sum + (recipe.cost / recipe.yieldGrams) * q;
    }
    return sum + (recipe.cost / (recipe.yieldUnits || 1)) * q;
  }, 0);

  const selectedRule = getRule(profitRuleId);
  const sellingPrice = selectedRule
    ? totalCost * (1 + selectedRule.markupPercentage / 100)
    : 0;

  const isValid = name.trim().length >= 2 && validRows.length > 0 && profitRuleId !== '';

  const addRow = () => {
    setRows((prev) => [...prev, { id: ++rowCounter, recipeId: '', quantity: '' }]);
  };

  const removeRow = (id: number) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const updateRow = (id: number, field: 'recipeId' | 'quantity', value: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const handleSubmit = async () => {
    setError('');
    if (!isValid) return;
    const recipeIds = validRows.map((r) => r.recipeId);
    const hasDuplicates = new Set(recipeIds).size !== recipeIds.length;
    if (hasDuplicates) {
      setError('Hay recetas repetidas.');
      return;
    }
    setLoading(true);
    try {
      await onSubmit({
        name: name.trim(),
        recipes: validRows.map((r) => ({
          recipeId: r.recipeId,
          quantity: parseFloat(r.quantity),
        })),
        profitRuleId,
      });
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : initialData ? 'Error al actualizar la bandeja.' : 'Error al crear la bandeja.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "Editar Bandeja" : "Nueva Bandeja"}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {/* Name */}
        <div>
          <label style={labelStyle}>Nombre de la bandeja</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='Ej: "Bandeja familiar"'
            style={inputStyle}
            autoFocus
          />
        </div>

        {/* Recipes */}
        <div>
          <label style={labelStyle}>Recetas</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {rows.map((row) => {
              const recipe = getRecipe(row.recipeId);
              const qNum = parseFloat(row.quantity);
              let rowCost: number | null = null;
              if (recipe && qNum > 0) {
                if (recipe.sellUnit === 'kg' && recipe.yieldGrams > 0) {
                  rowCost = (recipe.cost / recipe.yieldGrams) * qNum;
                } else {
                  rowCost = (recipe.cost / (recipe.yieldUnits || 1)) * qNum;
                }
              }
              const unitLabel = recipe ? (recipe.sellUnit === 'kg' ? 'g' : 'u.') : 'u.';
              return (
                <div key={row.id} style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center' }}>
                  <SearchableSelect
                    options={recipes.map((r) => ({
                      value: r._id,
                      label: `${r.name}${r.isSubRecipe ? ' (sub)' : ''} — ${r.sellUnit === 'kg' ? fmt(r.pricePer100g) + '/100g' : fmt(r.sellingPrice) + '/u.'}`,
                    }))}
                    value={row.recipeId}
                    onChange={(val) => updateRow(row.id, 'recipeId', val)}
                    placeholder="Receta..."
                    style={{ flex: 2 }}
                  />
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input
                      type="number"
                      value={row.quantity}
                      onChange={(e) => updateRow(row.id, 'quantity', e.target.value)}
                      placeholder="0"
                      min="0"
                      step="1"
                      style={{ ...inputStyle, width: '100%', paddingRight: '28px', boxSizing: 'border-box' }}
                    />
                    <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{unitLabel}</span>
                  </div>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--color-text-secondary)', minWidth: '60px', textAlign: 'right' }}>
                    {rowCost !== null ? fmt(rowCost) : ''}
                  </span>
                  <button onClick={() => removeRow(row.id)} disabled={rows.length === 1} style={{ ...iconBtnStyle, opacity: rows.length === 1 ? 0.3 : 1 }}>
                    <MdClose size={16} />
                  </button>
                </div>
              );
            })}
          </div>
          <button onClick={addRow} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', marginTop: 'var(--space-sm)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--color-primary)', padding: 0, fontWeight: 600 }}>
            <MdAdd size={18} /> Agregar receta
          </button>
        </div>

        {/* Profit rule */}
        <div>
          <label style={labelStyle}>Markup de ganancia</label>
          <select
            value={profitRuleId}
            onChange={(e) => setProfitRuleId(e.target.value)}
            style={inputStyle}
          >
            <option value="">Seleccioná un markup...</option>
            {profitRules.map((r) => (
              <option key={r._id} value={r._id}>{r.name} — {r.markupPercentage}%</option>
            ))}
          </select>
        </div>

        {/* Preview */}
        {validRows.length > 0 && profitRuleId && (
          <div style={{ background: '#f8f4db', borderRadius: 'var(--radius-sm)', padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
              Costo de producción: <strong>{fmt(totalCost)}</strong>
            </span>
            {selectedRule && (
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                Markup aplicado: <strong>{selectedRule.name} ({selectedRule.markupPercentage}%)</strong>
              </span>
            )}
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: 700, color: 'var(--color-primary)' }}>
              Precio de venta: {fmt(sellingPrice)}
            </span>
          </div>
        )}

        {error && (
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--color-error)', margin: 0 }}>{error}</p>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 'var(--space-md)', paddingTop: 'var(--space-xs)' }}>
          <button onClick={onClose} disabled={loading} style={cancelBtnStyle}>Cancelar</button>
          <button onClick={handleSubmit} disabled={!isValid || loading} style={submitBtnStyle(!isValid || loading)}>
            {loading ? 'Guardando...' : initialData ? 'Guardar Cambios' : 'Crear Bandeja'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '0.8rem',
  fontWeight: 600,
  color: 'var(--color-text-secondary)',
  display: 'block',
  marginBottom: 'var(--space-xs)',
};

const inputStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '0.9rem',
  padding: 'var(--space-xs) var(--space-sm)',
  border: '1.5px solid rgba(218, 193, 184, 0.4)',
  borderRadius: 'var(--radius-sm)',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  background: 'transparent',
  color: 'var(--color-text-primary)',
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

const iconBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '2px',
  color: 'var(--color-text-secondary)',
  display: 'flex',
  alignItems: 'center',
};
