import { useState, useEffect } from 'react';
import { MdAdd, MdClose } from 'react-icons/md';
import { Modal } from '../common/Modal';
import { SearchableSelect } from '../common/SearchableSelect';
import type { Ingredient } from '../../types/ingredient.types';
import type { ProfitRule } from '../../types/profit-rule.types';
import type { CreateRecipePayload, Recipe } from '../../types/recipe.types';

interface IngredientRow {
  id: number;
  ingredientId: string;
  quantity: string;
}

interface SubRecipeRow {
  id: number;
  recipeId: string;
  quantity: string;
}

interface RecipeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateRecipePayload) => Promise<void>;
  ingredients: Ingredient[];
  profitRules: ProfitRule[];
  subRecipes?: Recipe[];
  initialData?: Recipe | null;
}

let rowCounter = 0;

export function RecipeFormModal({ isOpen, onClose, onSubmit, ingredients, profitRules, subRecipes = [], initialData }: RecipeFormModalProps) {
  const [name, setName] = useState('');
  const [rows, setRows] = useState<IngredientRow[]>([{ id: ++rowCounter, ingredientId: '', quantity: '' }]);
  const [subRecipeRows, setSubRecipeRows] = useState<SubRecipeRow[]>([]);
  const [profitRuleId, setProfitRuleId] = useState('');
  const [sellUnit, setSellUnit] = useState<'unidad' | 'kg'>('unidad');
  const [yieldGrams, setYieldGrams] = useState('');
  const [yieldUnits, setYieldUnits] = useState('1');
  const [isSubRecipe, setIsSubRecipe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name);
        setProfitRuleId(initialData.profitRuleId);
        setSellUnit((initialData.sellUnit as 'unidad' | 'kg') || 'unidad');
        setYieldGrams(initialData.yieldGrams ? initialData.yieldGrams.toString() : '');
        setYieldUnits(initialData.yieldUnits ? initialData.yieldUnits.toString() : '1');
        setIsSubRecipe(!!initialData.isSubRecipe);
        
        const rRows: IngredientRow[] = [];
        const srRows: SubRecipeRow[] = [];
        
        initialData.ingredients.forEach(i => {
          if (i.isSubRecipe) {
            srRows.push({ id: ++rowCounter, recipeId: i.ingredientId, quantity: i.quantity.toString() });
          } else {
            rRows.push({ id: ++rowCounter, ingredientId: i.ingredientId, quantity: i.quantity.toString() });
          }
        });
        
        if (rRows.length === 0) rRows.push({ id: ++rowCounter, ingredientId: '', quantity: '' });
        
        setRows(rRows);
        setSubRecipeRows(srRows);
      } else {
        setName('');
        setRows([{ id: ++rowCounter, ingredientId: '', quantity: '' }]);
        setSubRecipeRows([]);
        setProfitRuleId(profitRules[0]?._id ?? '');
        setSellUnit('unidad');
        setYieldGrams('');
        setYieldUnits('1');
        setIsSubRecipe(false);
      }
      setError('');
    }
  }, [isOpen, initialData, profitRules]);

  const fmt = (v: number) =>
    `$${v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const getIngredient = (id: string) => ingredients.find((i) => i._id === id);
  const getRule = (id: string) => profitRules.find((r) => r._id === id);

  const getSubRecipe = (id: string) => subRecipes.find((r) => r._id === id);

  const validRows = rows.filter((r) => r.ingredientId && parseFloat(r.quantity) > 0);
  const validSubRecipeRows = subRecipeRows.filter((r) => r.recipeId && parseFloat(r.quantity) > 0);

  const ingredientCost = validRows.reduce((sum, row) => {
    const ing = getIngredient(row.ingredientId);
    if (!ing) return sum;
    const q = parseFloat(row.quantity);
    return sum + (ing.unit === 'unidad' ? ing.costPerUnit * q : (ing.costPerKg * q) / 1000);
  }, 0);

  const subRecipeCost = validSubRecipeRows.reduce((sum, row) => {
    const sub = getSubRecipe(row.recipeId);
    if (!sub) return sum;
    const q = parseFloat(row.quantity);
    if (sub.sellUnit === 'kg' && sub.yieldGrams > 0) {
      return sum + (sub.cost / sub.yieldGrams) * q;
    }
    return sum + (sub.cost / (sub.yieldUnits || 1)) * q;
  }, 0);

  const totalCost = ingredientCost + subRecipeCost;

  const selectedRule = getRule(profitRuleId);
  const yieldG = parseFloat(yieldGrams);
  const yieldU = parseInt(yieldUnits) || 1;

  let sellingPrice = 0;
  if (selectedRule) {
    if (sellUnit === 'kg' && yieldG > 0) {
      const costPerKg = (totalCost / yieldG) * 1000;
      sellingPrice = costPerKg * (1 + selectedRule.marginPercentage / 100);
    } else {
      sellingPrice = (totalCost * (1 + selectedRule.marginPercentage / 100)) / yieldU;
    }
  }

  const hasItems = validRows.length > 0 || validSubRecipeRows.length > 0;

  const isValid =
    name.trim().length >= 2 &&
    hasItems &&
    profitRuleId !== '' &&
    (sellUnit !== 'kg' || yieldG > 0);

  const addRow = () => {
    setRows((prev) => [...prev, { id: ++rowCounter, ingredientId: '', quantity: '' }]);
  };

  const removeRow = (id: number) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const updateRow = (id: number, field: 'ingredientId' | 'quantity', value: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const addSubRecipeRow = () => {
    setSubRecipeRows((prev) => [...prev, { id: ++rowCounter, recipeId: '', quantity: '' }]);
  };

  const removeSubRecipeRow = (id: number) => {
    setSubRecipeRows((prev) => prev.filter((r) => r.id !== id));
  };

  const updateSubRecipeRow = (id: number, field: 'recipeId' | 'quantity', value: string) => {
    setSubRecipeRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const handleSubmit = async () => {
    setError('');
    if (!isValid) return;
    const ingredientIds = validRows.map((r) => r.ingredientId);
    const hasDuplicates = new Set(ingredientIds).size !== ingredientIds.length;
    if (hasDuplicates) {
      setError('Hay ingredientes repetidos.');
      return;
    }
    setLoading(true);
    try {
      await onSubmit({
        name: name.trim(),
        ingredients: validRows.map((r) => ({
          ingredientId: r.ingredientId,
          quantity: parseFloat(r.quantity),
        })),
        subRecipes: validSubRecipeRows.length > 0
          ? validSubRecipeRows.map((r) => ({
              recipeId: r.recipeId,
              quantity: parseFloat(r.quantity),
            }))
          : undefined,
        profitRuleId,
        sellUnit,
        yieldGrams: sellUnit === 'kg' ? yieldG : undefined,
        yieldUnits: sellUnit === 'unidad' ? yieldU : undefined,
        isSubRecipe,
      });
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al crear la receta.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "Editar Receta" : "Nueva Receta"}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {/* Name */}
        <div>
          <label style={labelStyle}>Nombre de la receta</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='Ej: "Empanada de carne"'
            style={inputStyle}
            autoFocus
          />
        </div>

        {/* isSubRecipe toggle */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            padding: 'var(--space-sm) var(--space-md)',
            background: isSubRecipe ? 'rgba(188, 108, 37, 0.08)' : '#f2efd5',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            userSelect: 'none',
          }}
          onClick={() => setIsSubRecipe((v) => !v)}
        >
          <div
            style={{
              width: 36,
              height: 20,
              borderRadius: 10,
              background: isSubRecipe ? 'var(--color-primary)' : 'rgba(0,0,0,0.15)',
              position: 'relative',
              transition: 'background 0.2s',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: 'white',
                position: 'absolute',
                top: 2,
                left: isSubRecipe ? 18 : 2,
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }}
            />
          </div>
          <div>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Es una sub-receta
            </span>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: 0 }}>
              Activá si esta receta se usa dentro de otras recetas
            </p>
          </div>
        </div>

        {/* Ingredients */}
        <div>
          <label style={labelStyle}>Ingredientes</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {rows.map((row) => {
              const ing = getIngredient(row.ingredientId);
              const qNum = parseFloat(row.quantity);
              let rowCost: number | null = null;
              if (ing && qNum > 0) {
                rowCost = ing.unit === 'unidad' ? ing.costPerUnit * qNum : (ing.costPerKg * qNum) / 1000;
              }
              const unitLabel = ing ? (ing.unit === 'unidad' ? 'u.' : 'g') : 'g';
              return (
                <div key={row.id} style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center' }}>
                  <SearchableSelect
                    options={ingredients.map((i) => ({ value: i._id, label: `${i.name} (${i.unit === 'unidad' ? 'u.' : 'kg'})` }))}
                    value={row.ingredientId}
                    onChange={(val) => updateRow(row.id, 'ingredientId', val)}
                    placeholder="Ingrediente..."
                    style={{ flex: 2 }}
                  />
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input
                      type="number"
                      value={row.quantity}
                      onChange={(e) => updateRow(row.id, 'quantity', e.target.value)}
                      placeholder="0"
                      min="0"
                      step={ing?.unit === 'unidad' ? '1' : '1'}
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
            <MdAdd size={18} /> Agregar ingrediente
          </button>
        </div>

        {/* Sub-recipes section (only if there are available sub-recipes) */}
        {subRecipes.length > 0 && (
          <div>
            <label style={labelStyle}>Sub-recetas</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {subRecipeRows.map((row) => {
                const sub = getSubRecipe(row.recipeId);
                const qNum = parseFloat(row.quantity);
                let rowCost: number | null = null;
                if (sub && qNum > 0) {
                  if (sub.sellUnit === 'kg' && sub.yieldGrams > 0) {
                    rowCost = (sub.cost / sub.yieldGrams) * qNum;
                  } else {
                    rowCost = (sub.cost / (sub.yieldUnits || 1)) * qNum;
                  }
                }
                const unitLabel = sub ? (sub.sellUnit === 'kg' ? 'g' : 'u.') : 'u.';
                return (
                  <div key={row.id} style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center' }}>
                    <SearchableSelect
                      options={subRecipes.map((r) => ({ value: r._id, label: `${r.name} (${r.sellUnit === 'kg' ? 'kg' : 'x' + r.yieldUnits})` }))}
                      value={row.recipeId}
                      onChange={(val) => updateSubRecipeRow(row.id, 'recipeId', val)}
                      placeholder="Sub-receta..."
                      style={{ flex: 2 }}
                    />
                    <div style={{ position: 'relative', flex: 1 }}>
                      <input
                        type="number"
                        value={row.quantity}
                        onChange={(e) => updateSubRecipeRow(row.id, 'quantity', e.target.value)}
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
                    <button onClick={() => removeSubRecipeRow(row.id)} style={iconBtnStyle}>
                      <MdClose size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
            <button onClick={addSubRecipeRow} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', marginTop: 'var(--space-sm)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--color-primary)', padding: 0, fontWeight: 600 }}>
              <MdAdd size={18} /> Agregar sub-receta
            </button>
          </div>
        )}

        {/* Profit rule */}
        <div>
          <label style={labelStyle}>Margen de ganancia</label>
          <select
            value={profitRuleId}
            onChange={(e) => setProfitRuleId(e.target.value)}
            style={inputStyle}
          >
            <option value="">Seleccioná un margen...</option>
            {profitRules.map((r) => (
              <option key={r._id} value={r._id}>{r.name} — {r.marginPercentage}%</option>
            ))}
          </select>
        </div>

        {/* Sell unit */}
        <div>
          <label style={labelStyle}>Se vende por</label>
          <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
            {(['unidad', 'kg'] as const).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setSellUnit(u)}
                style={{
                  flex: 1,
                  padding: 'var(--space-sm)',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  background: sellUnit === u ? 'var(--color-primary)' : '#f2efd5',
                  color: sellUnit === u ? 'var(--color-on-primary)' : 'var(--color-text-secondary)',
                  transition: 'all 0.2s',
                }}
              >
                {u === 'unidad' ? 'Por unidad' : 'Por peso (kg)'}
              </button>
            ))}
          </div>
        </div>

        {/* Yield units (only for unidad) */}
        {sellUnit === 'unidad' && (
          <div>
            <label style={labelStyle}>Rinde (unidades que produce la receta)</label>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                value={yieldUnits}
                onChange={(e) => setYieldUnits(e.target.value)}
                placeholder="1"
                min="1"
                step="1"
                style={{ ...inputStyle, paddingRight: '28px' }}
              />
              <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>u.</span>
            </div>
          </div>
        )}

        {/* Yield grams (only for kg) */}
        {sellUnit === 'kg' && (
          <div>
            <label style={labelStyle}>Rendimiento (gramos que produce la receta)</label>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                value={yieldGrams}
                onChange={(e) => setYieldGrams(e.target.value)}
                placeholder="ej: 2000"
                min="0"
                style={{ ...inputStyle, paddingRight: '28px' }}
              />
              <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>g</span>
            </div>
          </div>
        )}

        {/* Preview */}
        {hasItems && profitRuleId && (
          <div style={{ background: '#f8f4db', borderRadius: 'var(--radius-sm)', padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
              Costo de producción: <strong>{fmt(totalCost)}</strong>
            </span>
            {selectedRule && (
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                Margen aplicado: <strong>{selectedRule.name} ({selectedRule.marginPercentage}%)</strong>
              </span>
            )}
            {sellUnit === 'kg' ? (
              <>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                  Precio por 100g: {fmt(sellingPrice / 10)}
                </span>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                  ({fmt(sellingPrice)}/kg)
                </span>
              </>
            ) : (
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                {yieldU > 1
                  ? `Precio por unidad (rinde ${yieldU}): ${fmt(sellingPrice)}`
                  : `Precio de venta: ${fmt(sellingPrice)}`}
              </span>
            )}
          </div>
        )}

        {error && (
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--color-error)', margin: 0 }}>{error}</p>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 'var(--space-md)', paddingTop: 'var(--space-xs)' }}>
          <button onClick={onClose} disabled={loading} style={cancelBtnStyle}>Cancelar</button>
          <button onClick={handleSubmit} disabled={!isValid || loading} style={submitBtnStyle(!isValid || loading)}>
            {loading ? 'Guardando...' : initialData ? 'Guardar Cambios' : 'Crear Receta'}
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
