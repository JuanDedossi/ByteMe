import { useState, useEffect } from 'react';
import { MdAdd, MdClose } from 'react-icons/md';
import { Modal } from '../common/Modal';
import { SearchableSelect } from '../common/SearchableSelect';
import type { Ingredient } from '../../types/ingredient.types';
import type { ProfitRule } from '../../types/profit-rule.types';
import type { Complement } from '../../types/complement.types';
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

interface ComplementRow {
  id: number;
  complementId: string;
  quantity: string;
}

interface RecipeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateRecipePayload) => Promise<void>;
  ingredients: Ingredient[];
  profitRules: ProfitRule[];
  complements: Complement[];
  subRecipes?: Recipe[];
  initialData?: Recipe | null;
}

let rowCounter = 0;

export function RecipeFormModal({
  isOpen,
  onClose,
  onSubmit,
  ingredients,
  profitRules,
  complements,
  subRecipes = [],
  initialData,
}: RecipeFormModalProps) {
  const [name, setName] = useState('');
  const [rows, setRows] = useState<IngredientRow[]>([{ id: ++rowCounter, ingredientId: '', quantity: '' }]);
  const [subRecipeRows, setSubRecipeRows] = useState<SubRecipeRow[]>([]);
  const [complementRows, setComplementRows] = useState<ComplementRow[]>([]);
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

        const cRows: ComplementRow[] = (initialData.complements ?? []).map((c) => ({
          id: ++rowCounter,
          complementId: c.complementId,
          quantity: c.quantity.toString(),
        }));
        setComplementRows(cRows);
      } else {
        setName('');
        setRows([{ id: ++rowCounter, ingredientId: '', quantity: '' }]);
        setSubRecipeRows([]);
        setComplementRows([]);
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
  const getComplement = (id: string) => complements.find((c) => c._id === id);
  // P1: only active complements are valid for NEW picks. Inactive ones already
  // loaded from initialData remain visible in the row (handled by getComplement
  // + the Inactivo badge below) but are excluded from the search options.
  const activeComplements = complements.filter((c) => c.isActive);

  const getSubRecipe = (id: string) => subRecipes.find((r) => r._id === id);

  const validRows = rows.filter((r) => r.ingredientId && parseFloat(r.quantity) > 0);
  const validSubRecipeRows = subRecipeRows.filter((r) => r.recipeId && parseFloat(r.quantity) > 0);
  // REQ-REC-17: complement quantity is unit-aware. unidad requires >= 1, metro
  // requires > 0. The complement document is resolved via getComplement (the
  // form keeps inactive entries visible, so `comp` is not guaranteed to exist
  // for every row — we treat unknown as "valid for filter" and rely on the
  // submission-time check below for the actual gate).
  const isComplementQuantityValid = (q: string, comp: Complement | undefined): boolean => {
    const n = parseFloat(q);
    if (Number.isNaN(n)) return false;
    if (!comp) return n > 0; // unknown unit: fall back to absolute floor
    return comp.unit === 'metro' ? n > 0 : n >= 1;
  };
  // REQ-REC-17: inline error message under each complement quantity input.
  // Unit-aware copy in Spanish; only shows when the row has a selected
  // complement AND a non-empty quantity that fails the rule.
  const complementQuantityError = (q: string, comp: Complement | undefined): string | null => {
    if (!comp || q === '') return null;
    if (isComplementQuantityValid(q, comp)) return null;
    return comp.unit === 'metro'
      ? 'La cantidad debe ser mayor a 0 metros'
      : 'La cantidad debe ser al menos 1 unidad';
  };
  const validComplementRows = complementRows.filter(
    (r) => r.complementId && isComplementQuantityValid(r.quantity, getComplement(r.complementId)),
  );

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
    // REQ-REC-13 / REQ-SUB-1: sub-recipe propagation uses sub.costBase (NOT costTotal).
    if (sub.sellUnit === 'kg' && sub.yieldGrams > 0) {
      return sum + (sub.costBase / sub.yieldGrams) * q;
    }
    return sum + (sub.costBase / (sub.yieldUnits || 1)) * q;
  }, 0);

  // costBase excludes own complements (REQ-REC-13).
  const costBase = ingredientCost + subRecipeCost;
  const complementCost = validComplementRows.reduce((sum, row) => {
    const c = getComplement(row.complementId);
    if (!c) return sum;
    return sum + c.costPerUnit * parseFloat(row.quantity);
  }, 0);
  // costTotal = costBase + own complements (REQ-REC-13 / REQ-PRI-3).
  const totalCost = costBase + complementCost;

  const selectedRule = getRule(profitRuleId);
  const yieldG = parseFloat(yieldGrams);
  const yieldU = parseInt(yieldUnits) || 1;

  let sellingPrice = 0;
  if (selectedRule) {
    if (sellUnit === 'kg' && yieldG > 0) {
      const costPerKg = (totalCost / yieldG) * 1000;
      sellingPrice = costPerKg * (1 + selectedRule.markupPercentage / 100);
    } else {
      sellingPrice = (totalCost * (1 + selectedRule.markupPercentage / 100)) / yieldU;
    }
  }

  const hasItems = validRows.length > 0 || validSubRecipeRows.length > 0;

  // Check that all complement rows satisfy the unit-aware rule (REQ-REC-17).
  const allComplementQuantitiesValid = complementRows.every(
    (r) => !r.complementId || isComplementQuantityValid(r.quantity, getComplement(r.complementId)),
  );

  const isValid =
    name.trim().length >= 2 &&
    hasItems &&
    profitRuleId !== '' &&
    (sellUnit !== 'kg' || yieldG > 0) &&
    allComplementQuantitiesValid;

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

  const addComplementRow = () => {
    setComplementRows((prev) => [...prev, { id: ++rowCounter, complementId: '', quantity: '' }]);
  };

  const removeComplementRow = (id: number) => {
    setComplementRows((prev) => prev.filter((r) => r.id !== id));
  };

  const updateComplementRow = (id: number, field: 'complementId' | 'quantity', value: string) => {
    setComplementRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
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
        complements: validComplementRows.length > 0
          ? validComplementRows.map((r) => ({
              complementId: r.complementId,
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
                  // REQ-REC-13 / REQ-SUB-1: sub-recipe cost preview uses costBase.
                  if (sub.sellUnit === 'kg' && sub.yieldGrams > 0) {
                    rowCost = (sub.costBase / sub.yieldGrams) * qNum;
                  } else {
                    rowCost = (sub.costBase / (sub.yieldUnits || 1)) * qNum;
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

        {/* Complementos section */}
        {complements.length > 0 && (
          <div>
            <label style={labelStyle}>Complementos</label>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.7rem',
                color: 'var(--color-text-secondary)',
                margin: '0 0 var(--space-sm)',
              }}
            >
              Packaging y decoración (bandejas, telas, moños).
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {complementRows.map((row) => {
                const comp = getComplement(row.complementId);
                const qNum = parseFloat(row.quantity);
                // Row cost preview uses the loaded complement's costPerUnit.
                // Inactive complements still contribute (REQ-REC-16). Preview
                // is unit-aware: only show when quantity passes the rule.
                const qPassesRule = isComplementQuantityValid(row.quantity, comp);
                const rowCost = comp && qPassesRule ? comp.costPerUnit * qNum : null;
                // REQ-REC-17: inline error text (Spanish, unit-aware) under
                // the quantity input. null when the row is empty or valid.
                const qError = complementQuantityError(row.quantity, comp);
                // P2: dynamic step/min driven by the unit (REQ-REC-17).
                // metro uses 0.1 (granular enough to allow 0.2); unidad uses 1.
                const stepValue = comp?.unit === 'metro' ? '0.1' : '1';
                const minValue = comp?.unit === 'metro' ? '0.1' : '1';
                const unitLabel = comp ? comp.unit : 'u.';
                return (
                  <div
                    key={row.id}
                    style={{
                      display: 'flex',
                      gap: 'var(--space-xs)',
                      alignItems: 'center',
                      opacity: comp && !comp.isActive ? 0.7 : 1,
                    }}
                  >
                    {/*
                     * P1: only active complements appear in the SearchableSelect
                     * options for new picks. Inactive complements already in the
                     * form's `complements[]` (from initialData) are rendered
                     * inline as a static label with an "Inactivo" badge so they
                     * remain visible.
                     */}
                    {comp && !comp.isActive ? (
                      <div
                        style={{
                          flex: 2,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--space-xs)',
                          padding: 'var(--space-xs) var(--space-sm)',
                          border: '1.5px solid rgba(218, 193, 184, 0.4)',
                          borderRadius: 'var(--radius-sm)',
                          minHeight: '36px',
                          boxSizing: 'border-box',
                        }}
                      >
                        <span
                          style={{
                            fontFamily: 'var(--font-body)',
                            fontSize: '0.9rem',
                            color: 'var(--color-text-primary)',
                            flex: 1,
                          }}
                        >
                          {comp.name} ({comp.unit})
                        </span>
                        <span
                          style={{
                            fontFamily: 'var(--font-body)',
                            fontSize: '0.6rem',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            background: 'var(--color-warning)',
                            color: 'var(--color-on-primary)',
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-full)',
                          }}
                        >
                          Inactivo
                        </span>
                      </div>
                    ) : (
                      <SearchableSelect
                        // P1: only active complements are offered as options.
                        options={activeComplements.map((c) => ({
                          value: c._id,
                          label: `${c.name} (${c.unit})`,
                        }))}
                        value={row.complementId}
                        onChange={(val) => updateComplementRow(row.id, 'complementId', val)}
                        placeholder="Complemento..."
                        style={{ flex: 2 }}
                      />
                    )}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="number"
                          value={row.quantity}
                          onChange={(e) => updateComplementRow(row.id, 'quantity', e.target.value)}
                          placeholder="0"
                          min={minValue}
                          step={stepValue}
                          style={{
                            ...inputStyle,
                            width: '100%',
                            paddingRight: '28px',
                            boxSizing: 'border-box',
                            ...(qError ? { borderColor: 'var(--color-primary)' } : {}),
                          }}
                          aria-invalid={qError ? 'true' : 'false'}
                        />
                        <span
                          style={{
                            position: 'absolute',
                            right: 8,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            fontFamily: 'var(--font-body)',
                            fontSize: '0.75rem',
                            color: 'var(--color-text-secondary)',
                          }}
                        >
                          {unitLabel}
                        </span>
                      </div>
                      {qError && (
                        <span
                          style={{
                            fontFamily: 'var(--font-body)',
                            fontSize: '0.7rem',
                            color: 'var(--color-primary)',
                            lineHeight: 1.2,
                          }}
                        >
                          {qError}
                        </span>
                      )}
                    </div>
                    <span
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '0.75rem',
                        color: 'var(--color-text-secondary)',
                        minWidth: '60px',
                        textAlign: 'right',
                      }}
                    >
                      {rowCost !== null ? fmt(rowCost) : ''}
                    </span>
                    <button onClick={() => removeComplementRow(row.id)} style={iconBtnStyle}>
                      <MdClose size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
            <button
              onClick={addComplementRow}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-xs)',
                marginTop: 'var(--space-sm)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                fontSize: '0.85rem',
                color: 'var(--color-primary)',
                padding: 0,
                fontWeight: 600,
              }}
            >
              <MdAdd size={18} /> Agregar complemento
            </button>
          </div>
        )}

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
            {/*
             * REQ-REC-14: when the recipe has complements, show BOTH costBase
             * and costTotal with disambiguating labels. Otherwise show one line
             * (costBase === costTotal when there are no complements).
             */}
            {validComplementRows.length > 0 ? (
              <>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                  Costo base (para usar en bandejas): <strong>{fmt(costBase)}</strong>
                </span>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                  Costo total (con empaque, para venta individual): <strong>{fmt(totalCost)}</strong>
                </span>
              </>
            ) : (
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                Costo de producción: <strong>{fmt(totalCost)}</strong>
              </span>
            )}
            {selectedRule && (
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                Markup aplicado: <strong>{selectedRule.name} ({selectedRule.markupPercentage}%)</strong>
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
