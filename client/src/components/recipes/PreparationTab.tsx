import { useMemo, useState } from 'react';
import {
  MdAdd,
  MdArrowUpward,
  MdArrowDownward,
  MdClose,
  MdDelete,
  MdEdit,
  MdOpenInNew,
  MdPlayCircleOutline,
} from 'react-icons/md';
import { recipesService } from '../../services/recipes.service';
import type {
  Preparation,
  PreparationStep,
  Recipe,
  RecipeIngredient,
} from '../../types/recipe.types';

interface PreparationTabProps {
  recipe: Recipe;
  onUpdated: (recipe: Recipe) => void;
}

/**
 * Preparation editor + viewer.
 *
 * Read mode shows ordered steps with text and ingredient chips. Each chip
 * shows the per-step quantity (`X g · ingredientName`). Orphan refs render
 * as muted `ingrediente eliminado`. The "Ver preparación" button opens the
 * reel externally.
 *
 * Edit mode lets the user add/edit/reorder/delete steps, attach ingredient
 * chips with per-step quantities (the same ingredient can appear multiple
 * times across the recipe — e.g. flour in step 1 and step 5), and set the
 * video URL. Save happens via PATCH /api/recipes/:id/preparation.
 *
 * The chip picker modal shows each recipe ingredient with `X g restante`
 * computed as `recipe.quantity - sum(step quantities using this ingredient)`.
 * Tapping an ingredient adds it to the current step with the remaining
 * quantity (or the full recipe quantity if nothing is yet assigned).
 */
export function PreparationTab({ recipe, onUpdated }: PreparationTabProps) {
  const preparation = recipe.preparation;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Preparation | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Chip picker modal: which step is receiving new chips.
  const [pickerForStep, setPickerForStep] = useState<number | null>(null);

  const findIngredient = (id: string): RecipeIngredient | undefined =>
    recipe.ingredients.find((i) => i.ingredientId === id);

  const isOrphan = (id: string): boolean => !findIngredient(id);

  /**
   * Sum the per-step quantity assigned to a given ingredient across ALL
   * steps in the draft (or persisted preparation if no draft is active).
   * Used to compute remaining quantity in the picker.
   */
  const totalUsedFor = (
    ingredientId: string,
    stepsSource: PreparationStep[] | undefined
  ): number => {
    if (!stepsSource) return 0;
    return stepsSource.reduce((sum, s) => {
      return (
        sum +
        s.ingredientItems
          .filter((i) => i.ingredientId === ingredientId)
          .reduce((sub, i) => sub + i.quantity, 0)
      );
    }, 0);
  };

  const remainingFor = (
    ingredient: RecipeIngredient,
    stepsSource: PreparationStep[] | undefined
  ): number => ingredient.quantity - totalUsedFor(ingredient.ingredientId, stepsSource);

  // During edit mode, use the draft steps for remaining calculations so
  // the picker updates live as the user moves quantities around.
  const stepsForRemaining = (): PreparationStep[] | undefined =>
    editing && draft ? draft.steps : preparation?.steps;

  const sortedSteps = useMemo(() => {
    const list = preparation?.steps ?? [];
    return [...list].sort((a, b) => a.order - b.order);
  }, [preparation?.steps]);

  const enterEdit = () => {
    setDraft(preparation ?? { steps: [], videoUrl: undefined });
    setError(null);
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft(null);
    setError(null);
    setEditing(false);
  };

  const saveEdit = async () => {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await recipesService.updatePreparation(recipe._id, draft);
      onUpdated(updated);
      setEditing(false);
      setDraft(null);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'No se pudo guardar la preparación';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const addStep = () => {
    if (!draft) return;
    const maxOrder = draft.steps.reduce((m, s) => Math.max(m, s.order), 0);
    setDraft({
      ...draft,
      steps: [
        ...draft.steps,
        { order: maxOrder + 1, text: '', ingredientItems: [] },
      ],
    });
  };

  const updateStepText = (idx: number, text: string) => {
    if (!draft) return;
    setDraft({
      ...draft,
      steps: draft.steps.map((s, i) => (i === idx ? { ...s, text } : s)),
    });
  };

  const moveStep = (idx: number, direction: -1 | 1) => {
    if (!draft) return;
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= draft.steps.length) return;
    const next = [...draft.steps];
    const a = next[idx]!;
    const b = next[targetIdx]!;
    next[idx] = b;
    next[targetIdx] = a;
    next.forEach((s, i) => {
      s.order = i + 1;
    });
    setDraft({ ...draft, steps: next });
  };

  const deleteStep = (idx: number) => {
    if (!draft) return;
    const next = draft.steps.filter((_, i) => i !== idx);
    next.forEach((s, i) => {
      s.order = i + 1;
    });
    setDraft({ ...draft, steps: next });
  };

  const addItemToStep = (
    stepIdx: number,
    ingredientId: string,
    quantity: number
  ) => {
    if (!draft) return;
    setDraft({
      ...draft,
      steps: draft.steps.map((s, i) =>
        i === stepIdx
          ? {
              ...s,
              ingredientItems: [
                ...s.ingredientItems,
                { ingredientId, quantity },
              ],
            }
          : s
      ),
    });
  };

  const removeItemFromStep = (stepIdx: number, itemIdx: number) => {
    if (!draft) return;
    setDraft({
      ...draft,
      steps: draft.steps.map((s, i) =>
        i === stepIdx
          ? {
              ...s,
              ingredientItems: s.ingredientItems.filter(
                (_, j) => j !== itemIdx
              ),
            }
          : s
      ),
    });
  };

  const updateItemQuantity = (
    stepIdx: number,
    itemIdx: number,
    quantity: number
  ) => {
    if (!draft) return;
    if (Number.isNaN(quantity) || quantity < 0) return;
    setDraft({
      ...draft,
      steps: draft.steps.map((s, i) =>
        i === stepIdx
          ? {
              ...s,
              ingredientItems: s.ingredientItems.map((item, j) =>
                j === itemIdx ? { ...item, quantity } : item
              ),
            }
          : s
      ),
    });
  };

  const updateVideoUrl = (url: string) => {
    if (!draft) return;
    setDraft({
      ...draft,
      videoUrl: url.trim() === '' ? undefined : url.trim(),
    });
  };

  const openVideo = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // ---- Edit mode ----
  // NOTE: edit mode must take precedence over the empty state below — when
  // the user taps "Agregar preparación" from the empty state, `preparation`
  // is still undefined/empty on the next render, so the empty-state branch
  // would win and the editor would never appear.

  if (editing && draft) {
    return (
      <div>
        {error && (
          <p
            style={{
              fontFamily: 'var(--font-body)',
              color: 'var(--color-error)',
              fontSize: '0.85rem',
              margin: '0 0 var(--space-sm)',
            }}
          >
            {error}
          </p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {draft.steps.map((step, idx) => (
            <StepCard
              key={idx}
              step={step}
              totalSteps={draft.steps.length}
              onTextChange={(text) => updateStepText(idx, text)}
              onMoveUp={() => moveStep(idx, -1)}
              onMoveDown={() => moveStep(idx, 1)}
              onDelete={() => deleteStep(idx)}
              onAddItem={() => setPickerForStep(idx)}
              onRemoveItem={(itemIdx) => removeItemFromStep(idx, itemIdx)}
              onUpdateItemQuantity={(itemIdx, q) => updateItemQuantity(idx, itemIdx, q)}
              findIngredient={findIngredient}
              isOrphan={isOrphan}
            />
          ))}
        </div>

        <button
          onClick={addStep}
          style={{
            marginTop: 'var(--space-md)',
            background: 'transparent',
            border: '1px dashed var(--color-secondary)',
            color: 'var(--color-secondary)',
            padding: 'var(--space-sm) var(--space-md)',
            borderRadius: 'var(--radius-md)',
            fontFamily: 'var(--font-body)',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
          }}
        >
          <MdAdd size={16} />
          Paso
        </button>

        <div
          style={{
            marginTop: 'var(--space-lg)',
            padding: 'var(--space-md)',
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <label
            style={{
              display: 'block',
              fontFamily: 'var(--font-body)',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--color-text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 'var(--space-xs)',
            }}
          >
            Link al reel (Instagram o TikTok)
          </label>
          <input
            type="url"
            value={draft.videoUrl ?? ''}
            onChange={(e) => updateVideoUrl(e.target.value)}
            placeholder="https://www.instagram.com/reel/..."
            style={{
              width: '100%',
              fontFamily: 'var(--font-body)',
              fontSize: '0.85rem',
              padding: 'var(--space-sm)',
              border: '1px solid var(--color-secondary)',
              borderRadius: 'var(--radius-sm)',
              boxSizing: 'border-box',
              color: 'var(--color-text-primary)',
            }}
          />
          {draft.videoUrl && !isInstagramOrTikTok(draft.videoUrl) && (
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.75rem',
                color: 'var(--color-warning)',
                margin: 'var(--space-xs) 0 0',
              }}
            >
              No parece ser un link de Instagram o TikTok. Se va a guardar igual.
            </p>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            gap: 'var(--space-sm)',
            marginTop: 'var(--space-lg)',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={cancelEdit}
            disabled={saving}
            style={secondaryBtnStyle}
          >
            Cancelar
          </button>
          <button
            onClick={saveEdit}
            disabled={saving}
            style={{
              ...primaryBtnStyle,
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>

        {pickerForStep !== null && (
          <ChipPicker
            recipe={recipe}
            stepsSource={stepsForRemaining()}
            onPick={(ingredientId, quantity) => {
              addItemToStep(pickerForStep, ingredientId, quantity);
              setPickerForStep(null);
            }}
            onClose={() => setPickerForStep(null)}
            remainingFor={remainingFor}
          />
        )}
      </div>
    );
  }

  // ---- Empty state ----

  if (!preparation || preparation.steps.length === 0) {
    return (
      <div
        style={{
          padding: 'var(--space-lg)',
          textAlign: 'center',
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <MdPlayCircleOutline
          size={42}
          color="var(--color-primary)"
          style={{ marginBottom: 'var(--space-sm)' }}
        />
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.9rem',
            color: 'var(--color-text-secondary)',
            margin: '0 0 var(--space-md)',
          }}
        >
          Esta receta todavía no tiene preparación.
        </p>
        <button
          onClick={enterEdit}
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.85rem',
            fontWeight: 600,
            background: 'var(--color-primary)',
            color: 'var(--color-on-primary)',
            border: 'none',
            borderRadius: 'var(--radius-full)',
            padding: 'var(--space-sm) var(--space-lg)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <MdAdd size={16} />
          Agregar preparación
        </button>
      </div>
    );
  }

  // ---- Read mode ----

  return (
    <div>
      {error && (
        <p
          style={{
            fontFamily: 'var(--font-body)',
            color: 'var(--color-error)',
            fontSize: '0.85rem',
            margin: '0 0 var(--space-sm)',
          }}
        >
          {error}
        </p>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 'var(--space-sm)',
          marginBottom: 'var(--space-sm)',
        }}
      >
        {preparation.videoUrl && preparation.videoUrl.trim() !== '' && (
          <button
            onClick={() => openVideo(preparation.videoUrl!)}
            style={primaryBtnStyle}
          >
            <MdOpenInNew size={14} />
            Ver preparación
          </button>
        )}
        <button
          onClick={enterEdit}
          style={secondaryBtnStyle}
          title="Editar preparación"
        >
          <MdEdit size={14} />
          Editar
        </button>
      </div>

      <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {sortedSteps.map((step, idx) => (
          <li
            key={idx}
            style={{
              padding: 'var(--space-md)',
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-sm)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--space-sm)',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-headline)',
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  color: 'var(--color-primary)',
                  minWidth: '1.5rem',
                }}
              >
                {step.order}.
              </span>
              <p
                style={{
                  flex: 1,
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.9rem',
                  color: 'var(--color-text-primary)',
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {step.text}
              </p>
            </div>

            {step.ingredientItems.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 'var(--space-xs)',
                  marginTop: 'var(--space-sm)',
                  marginLeft: '1.5rem',
                }}
              >
                {step.ingredientItems.map((item, itemIdx) => {
                  const ing = findIngredient(item.ingredientId);
                  if (!ing) {
                    return (
                      <span
                        key={`orphan-${idx}-${itemIdx}`}
                        style={orphanChipStyle}
                      >
                        ingrediente eliminado
                      </span>
                    );
                  }
                  const unitLabel =
                    ing.ingredientUnit === 'unidad' ? 'u.' : 'g';
                  return (
                    <span key={`ing-${idx}-${itemIdx}`} style={normalChipStyle}>
                      <strong>{item.quantity}</strong>
                      <span>{unitLabel}</span>
                      <span style={{ opacity: 0.7 }}>·</span>
                      <span>{ing.ingredientName}</span>
                    </span>
                  );
                })}
              </div>
            )}
          </li>
        ))}
      </ol>

      {preparation.videoUrl && preparation.videoUrl.trim() !== '' && (
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.7rem',
            color: 'var(--color-text-secondary)',
            margin: 'var(--space-md) 0 0',
            textAlign: 'center',
          }}
        >
          ¿No funciona el botón? Abrí el link manualmente:
          <br />
          <a
            href={preparation.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--color-primary)', wordBreak: 'break-all' }}
          >
            {preparation.videoUrl}
          </a>
        </p>
      )}
    </div>
  );
}

// ---- Sub-components ----

interface StepCardProps {
  step: PreparationStep;
  totalSteps: number;
  onTextChange: (text: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onAddItem: () => void;
  onRemoveItem: (itemIdx: number) => void;
  onUpdateItemQuantity: (itemIdx: number, quantity: number) => void;
  findIngredient: (id: string) => RecipeIngredient | undefined;
  isOrphan: (id: string) => boolean;
}

function StepCard({
  step,
  totalSteps,
  onTextChange,
  onMoveUp,
  onMoveDown,
  onDelete,
  onAddItem,
  onRemoveItem,
  onUpdateItemQuantity,
  findIngredient,
  isOrphan,
}: StepCardProps) {
  return (
    <div
      style={{
        padding: 'var(--space-md)',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
        <span
          style={{
            fontFamily: 'var(--font-headline)',
            fontSize: '1rem',
            fontWeight: 700,
            color: 'var(--color-primary)',
            minWidth: '1.5rem',
          }}
        >
          {step.order}.
        </span>
        <textarea
          value={step.text}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder="Describe el paso..."
          rows={2}
          style={{
            flex: 1,
            fontFamily: 'var(--font-body)',
            fontSize: '0.85rem',
            padding: 'var(--space-xs)',
            border: '1px solid var(--color-secondary)',
            borderRadius: 'var(--radius-sm)',
            resize: 'vertical',
            color: 'var(--color-text-primary)',
          }}
        />
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--space-xs)',
          marginTop: 'var(--space-sm)',
          marginLeft: '1.5rem',
          alignItems: 'center',
        }}
      >
        {step.ingredientItems.map((item, itemIdx) => {
          const ing = findIngredient(item.ingredientId);
          const orphan = isOrphan(item.ingredientId);
          const unitLabel = ing
            ? ing.ingredientUnit === 'unidad'
              ? 'u.'
              : 'g'
            : 'g';
          return (
            <span
              key={`step-${step.order}-item-${itemIdx}`}
              style={orphan ? orphanChipStyle : normalChipStyle}
            >
              {orphan ? (
                <>
                  ingrediente eliminado
                  <button
                    onClick={() => onRemoveItem(itemIdx)}
                    style={removeChipIconStyle}
                    aria-label="Quitar ingrediente"
                  >
                    <MdClose size={12} />
                  </button>
                </>
              ) : (
                <>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (!Number.isNaN(v)) onUpdateItemQuantity(itemIdx, v);
                    }}
                    style={chipQtyInputStyle}
                  />
                  <span style={{ fontWeight: 700 }}>{unitLabel}</span>
                  <span style={{ opacity: 0.7 }}>·</span>
                  <span>{ing!.ingredientName}</span>
                  <button
                    onClick={() => onRemoveItem(itemIdx)}
                    style={removeChipIconStyle}
                    aria-label={`Quitar ${ing!.ingredientName}`}
                  >
                    <MdClose size={12} />
                  </button>
                </>
              )}
            </span>
          );
        })}
        <button
          onClick={onAddItem}
          style={{
            background: 'transparent',
            border: '1px dashed var(--color-secondary)',
            color: 'var(--color-secondary)',
            borderRadius: 'var(--radius-full)',
            padding: '2px 10px',
            fontSize: '0.7rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontFamily: 'var(--font-body)',
          }}
        >
          <MdAdd size={12} />
          Ingrediente
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 'var(--space-xs)',
          marginTop: 'var(--space-sm)',
        }}
      >
        <IconBtn onClick={onMoveUp} disabled={step.order <= 1} ariaLabel="Subir">
          <MdArrowUpward size={14} />
        </IconBtn>
        <IconBtn
          onClick={onMoveDown}
          disabled={step.order >= totalSteps}
          ariaLabel="Bajar"
        >
          <MdArrowDownward size={14} />
        </IconBtn>
        <IconBtn onClick={onDelete} ariaLabel="Eliminar" color="var(--color-error)">
          <MdDelete size={14} />
        </IconBtn>
      </div>
    </div>
  );
}

interface ChipPickerProps {
  recipe: Recipe;
  stepsSource: PreparationStep[] | undefined;
  onPick: (ingredientId: string, quantity: number) => void;
  onClose: () => void;
  remainingFor: (
    ingredient: RecipeIngredient,
    stepsSource: PreparationStep[] | undefined
  ) => number;
}

function ChipPicker({
  recipe,
  stepsSource,
  onPick,
  onClose,
  remainingFor,
}: ChipPickerProps) {
  const [search, setSearch] = useState('');
  const filtered = recipe.ingredients.filter((ing) =>
    ing.ingredientName.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
        padding: 'var(--space-md)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--color-surface)',
          width: '100%',
          maxWidth: 480,
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-lg)',
          maxHeight: '70vh',
          overflowY: 'auto',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 'var(--space-md)',
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--font-headline)',
              fontSize: '1.1rem',
              color: 'var(--color-text-primary)',
              margin: 0,
            }}
          >
            Vincular ingrediente
          </h2>
          <button onClick={onClose} aria-label="Cerrar" style={iconBtnStyle}>
            <MdClose size={18} />
          </button>
        </div>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar ingrediente..."
          autoFocus
          style={{
            width: '100%',
            fontFamily: 'var(--font-body)',
            fontSize: '0.9rem',
            padding: 'var(--space-sm)',
            border: '1px solid var(--color-secondary)',
            borderRadius: 'var(--radius-sm)',
            boxSizing: 'border-box',
            marginBottom: 'var(--space-md)',
            color: 'var(--color-text-primary)',
          }}
        />
        {filtered.length === 0 ? (
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.85rem',
              color: 'var(--color-text-secondary)',
              textAlign: 'center',
            }}
          >
            No hay ingredientes para mostrar.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
            {filtered.map((ing) => {
              const remaining = remainingFor(ing, stepsSource);
              const unitLabel = ing.ingredientUnit === 'unidad' ? 'u.' : 'g';
              const overAllocated = remaining < 0;
              const fullyUsed = remaining === 0;
              return (
                <button
                  key={ing.ingredientId}
                  onClick={() => {
                    const defaultQty = remaining > 0 ? remaining : ing.quantity;
                    onPick(ing.ingredientId, defaultQty);
                  }}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%',
                    padding: 'var(--space-sm) var(--space-md)',
                    background: 'var(--color-background)',
                    border: '1px solid rgba(188, 108, 37, 0.2)',
                    borderRadius: 'var(--radius-sm)',
                    fontFamily: 'var(--font-body)',
                    cursor: 'pointer',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.9rem',
                      fontWeight: 500,
                    }}
                  >
                    {ing.ingredientName}
                  </span>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: overAllocated
                        ? 'var(--color-warning)'
                        : fullyUsed
                          ? 'var(--color-text-secondary)'
                          : 'var(--color-primary)',
                      fontWeight: 600,
                    }}
                  >
                    {overAllocated
                      ? `Excede por ${Math.abs(remaining)} ${unitLabel}`
                      : fullyUsed
                        ? `Usado completo`
                        : `${remaining} ${unitLabel} restante`}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Inline subcomponents ----

function IconBtn({
  onClick,
  disabled,
  ariaLabel,
  children,
  color,
}: {
  onClick: () => void;
  disabled?: boolean;
  ariaLabel: string;
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      style={{
        background: 'none',
        border: '1px solid var(--color-secondary)',
        color: color ?? 'var(--color-text-secondary)',
        padding: '4px',
        borderRadius: 'var(--radius-sm)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        display: 'inline-flex',
        alignItems: 'center',
      }}
    >
      {children}
    </button>
  );
}

// ---- Style constants ----

const normalChipStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  fontFamily: 'var(--font-body)',
  fontSize: '0.75rem',
  background: 'rgba(188, 108, 37, 0.12)',
  color: 'var(--color-primary)',
  borderRadius: 'var(--radius-full)',
  padding: '4px 10px',
  border: 'none',
};

const orphanChipStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  fontFamily: 'var(--font-body)',
  fontSize: '0.75rem',
  background: 'transparent',
  color: 'var(--color-text-secondary)',
  border: '1px dashed var(--color-text-secondary)',
  borderRadius: 'var(--radius-full)',
  padding: '4px 10px',
  opacity: 0.6,
};

const chipQtyInputStyle: React.CSSProperties = {
  width: 50,
  fontFamily: 'var(--font-body)',
  fontSize: '0.75rem',
  padding: '0 4px',
  border: 'none',
  background: 'transparent',
  color: 'var(--color-primary)',
  fontWeight: 700,
  outline: 'none',
};

const removeChipIconStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'inherit',
  display: 'inline-flex',
  alignItems: 'center',
  padding: 0,
  marginLeft: 4,
  opacity: 0.7,
};

const primaryBtnStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '0.8rem',
  fontWeight: 600,
  background: 'var(--color-primary)',
  color: 'var(--color-on-primary)',
  border: 'none',
  borderRadius: 'var(--radius-full)',
  padding: 'var(--space-xs) var(--space-md)',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
};

const secondaryBtnStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '0.8rem',
  fontWeight: 600,
  background: 'transparent',
  color: 'var(--color-secondary)',
  border: '1px solid var(--color-secondary)',
  borderRadius: 'var(--radius-full)',
  padding: 'var(--space-xs) var(--space-md)',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
};

const iconBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--color-text-secondary)',
  display: 'inline-flex',
  alignItems: 'center',
};

// ---- Helpers ----

function isInstagramOrTikTok(url: string): boolean {
  const lower = url.toLowerCase();
  return (
    lower.includes('instagram.com') ||
    lower.includes('instagr.am') ||
    lower.includes('tiktok.com')
  );
}
