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
 * Preparation editor + viewer. Read-mode shows steps with chips and the
 * "Ver preparación" external link button. Edit-mode lets the user add,
 * edit, reorder, delete steps; attach ingredient chips; set the video
 * URL; and save via PATCH /api/recipes/:id/preparation.
 *
 * The chip tap-to-edit-quantity flow reuses recipesService.update(...) to
 * write back to /api/recipes/:id (which accepts partial ingredients[]).
 */
export function PreparationTab({ recipe, onUpdated }: PreparationTabProps) {
  const preparation = recipe.preparation;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Preparation | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inline chip quantity edit state: which (stepIdx, ingredientId) is being
  // edited, and the working value.
  const [chipEdit, setChipEdit] = useState<{
    stepIdx: number;
    ingredientId: string;
    value: string;
  } | null>(null);

  // Chip picker modal: which step is receiving new chips.
  const [pickerForStep, setPickerForStep] = useState<number | null>(null);

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
        { order: maxOrder + 1, text: '', ingredientRefs: [] },
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
    // Re-normalize order.
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

  const addChipToStep = (stepIdx: number, ingredientId: string) => {
    if (!draft) return;
    setDraft({
      ...draft,
      steps: draft.steps.map((s, i) =>
        i === stepIdx && !s.ingredientRefs.includes(ingredientId)
          ? { ...s, ingredientRefs: [...s.ingredientRefs, ingredientId] }
          : s,
      ),
    });
  };

  const removeChipFromStep = (stepIdx: number, ingredientId: string) => {
    if (!draft) return;
    setDraft({
      ...draft,
      steps: draft.steps.map((s, i) =>
        i === stepIdx
          ? {
              ...s,
              ingredientRefs: s.ingredientRefs.filter((r) => r !== ingredientId),
            }
          : s,
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

  // ---- Inline chip quantity edit (read-mode flow, mutates recipe ingredients) ----

  const startChipQuantityEdit = (
    stepIdx: number,
    ingredientId: string,
    currentQuantity: number
  ) => {
    setChipEdit({ stepIdx, ingredientId, value: String(currentQuantity) });
  };

  const cancelChipQuantityEdit = () => {
    setChipEdit(null);
  };

  const commitChipQuantityEdit = async (
    _stepIdx: number,
    ingredient: RecipeIngredient,
    newQuantity: number
  ): Promise<boolean> => {
    if (newQuantity <= 0) return false;
    setSaving(true);
    setError(null);
    try {
      // Split current recipe.ingredients back into regular + sub-recipe arrays
      // (server payload shape).
      const regularIngredients: { ingredientId: string; quantity: number }[] = [];
      const subRecipeItems: { recipeId: string; quantity: number }[] = [];

      for (const ing of recipe.ingredients) {
        if (ing.ingredientId === ingredient.ingredientId) {
          if (ing.isSubRecipe) {
            subRecipeItems.push({
              recipeId: ingredient.ingredientId,
              quantity: newQuantity,
            });
          } else {
            regularIngredients.push({
              ingredientId: ingredient.ingredientId,
              quantity: newQuantity,
            });
          }
        } else if (ing.isSubRecipe) {
          subRecipeItems.push({
            recipeId: ingredient.ingredientId,
            quantity: ing.quantity,
          });
        } else {
          regularIngredients.push({
            ingredientId: ingredient.ingredientId,
            quantity: ing.quantity,
          });
        }
      }

      const payload = {
        ingredients: regularIngredients,
        subRecipes: subRecipeItems,
      };
      const updated = await recipesService.update(recipe._id, payload);
      onUpdated(updated);
      setChipEdit(null);
      return true;
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'No se pudo actualizar la cantidad';
      setError(msg);
      return false;
    } finally {
      setSaving(false);
    }
  };

  // ---- Render helpers ----

  const findIngredient = (id: string): RecipeIngredient | undefined =>
    recipe.ingredients.find((i) => i.ingredientId === id);

  const isOrphanRef = (refId: string): boolean => !findIngredient(refId);

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
              onAddChip={() => setPickerForStep(idx)}
              onRemoveChip={(id) => removeChipFromStep(idx, id)}
              isOrphan={isOrphanRef}
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
            onPick={(id) => {
              addChipToStep(pickerForStep, id);
            }}
            onClose={() => setPickerForStep(null)}
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

            {step.ingredientRefs.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 'var(--space-xs)',
                  marginTop: 'var(--space-sm)',
                  marginLeft: '1.5rem',
                }}
              >
                {step.ingredientRefs.map((ref) => {
                  const ing = findIngredient(ref);
                  if (!ing) {
                    return (
                      <span key={ref} style={orphanChipStyle}>
                        ingrediente eliminado
                      </span>
                    );
                  }
                  const isEditing =
                    chipEdit?.stepIdx === idx &&
                    chipEdit?.ingredientId === ref;
                  return (
                    <button
                      key={ref}
                      type="button"
                      onClick={() =>
                        startChipQuantityEdit(idx, ref, ing.quantity)
                      }
                      style={normalChipStyle}
                      title="Tocá para editar la cantidad"
                    >
                      {isEditing ? (
                        <span
                          style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="number"
                            value={chipEdit!.value}
                            autoFocus
                            min="0"
                            step="0.01"
                            onChange={(e) =>
                              setChipEdit({
                                ...chipEdit!,
                                value: e.target.value,
                              })
                            }
                            onKeyDown={async (e) => {
                              if (e.key === 'Enter') {
                                const v = parseFloat(chipEdit!.value);
                                if (!isNaN(v)) {
                                  await commitChipQuantityEdit(idx, ing, v);
                                }
                              }
                              if (e.key === 'Escape') {
                                cancelChipQuantityEdit();
                              }
                            }}
                            style={chipInputStyle}
                          />
                          <span style={{ fontWeight: 700 }}>
                            {ing.ingredientUnit === 'unidad' ? 'u.' : 'g'}
                          </span>
                        </span>
                      ) : (
                        <>
                          <strong>{ing.quantity}</strong>
                          <span>
                            {ing.ingredientUnit === 'unidad' ? 'u.' : 'g'}
                          </span>
                          <span style={{ opacity: 0.7 }}>·</span>
                          <span>{ing.ingredientName}</span>
                        </>
                      )}
                    </button>
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
  onAddChip: () => void;
  onRemoveChip: (ingredientId: string) => void;
  isOrphan: (refId: string) => boolean;
}

function StepCard({
  step,
  totalSteps,
  onTextChange,
  onMoveUp,
  onMoveDown,
  onDelete,
  onAddChip,
  onRemoveChip,
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
        {step.ingredientRefs.map((ref) => {
          const orphan = isOrphan(ref);
          return (
            <span key={ref} style={orphan ? orphanChipStyle : normalChipStyle}>
              {orphan ? 'ingrediente eliminado' : ref.slice(-6)}
              <button
                onClick={() => onRemoveChip(ref)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'inherit',
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: 0,
                  marginLeft: 4,
                }}
                aria-label="Quitar chip"
              >
                <MdClose size={12} />
              </button>
            </span>
          );
        })}
        <button
          onClick={onAddChip}
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
        <IconBtn onClick={onMoveUp} disabled={step.order <= 1} aria-label="Subir">
          <MdArrowUpward size={14} />
        </IconBtn>
        <IconBtn
          onClick={onMoveDown}
          disabled={step.order >= totalSteps}
          aria-label="Bajar"
        >
          <MdArrowDownward size={14} />
        </IconBtn>
        <IconBtn onClick={onDelete} aria-label="Eliminar" color="var(--color-error)">
          <MdDelete size={14} />
        </IconBtn>
      </div>
    </div>
  );
}

function ChipPicker({
  recipe,
  onPick,
  onClose,
}: {
  recipe: Recipe;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = recipe.ingredients.filter((ing) =>
    ing.ingredientName.toLowerCase().includes(search.toLowerCase()),
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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-xs)' }}>
            {filtered.map((ing) => (
              <button
                key={ing.ingredientId}
                onClick={() => onPick(ing.ingredientId)}
                style={{
                  ...normalChipStyle,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {ing.ingredientName}
              </button>
            ))}
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
  children,
  ...rest
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: 'none',
        border: '1px solid var(--color-secondary)',
        color: 'var(--color-text-secondary)',
        padding: '4px',
        borderRadius: 'var(--radius-sm)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        ...(rest.style ?? {}),
      }}
      aria-label={rest['aria-label']}
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
  fontSize: '0.7rem',
  background: 'rgba(188, 108, 37, 0.12)',
  color: 'var(--color-primary)',
  borderRadius: 'var(--radius-full)',
  padding: '2px 10px',
  border: 'none',
  cursor: 'pointer',
};

const orphanChipStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  fontFamily: 'var(--font-body)',
  fontSize: '0.7rem',
  background: 'transparent',
  color: 'var(--color-text-secondary)',
  border: '1px dashed var(--color-text-secondary)',
  borderRadius: 'var(--radius-full)',
  padding: '2px 10px',
  opacity: 0.6,
};

const chipInputStyle: React.CSSProperties = {
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
