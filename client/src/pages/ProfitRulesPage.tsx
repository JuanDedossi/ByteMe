import { useState, useEffect, useCallback } from 'react';
import { MdAdd } from 'react-icons/md';
import { ProfitRuleCard } from '../components/profits/ProfitRuleCard';
import { ProfitRuleFormModal } from '../components/profits/ProfitRuleFormModal';
import { profitRulesService } from '../services/profit-rules.service';
import type { ProfitRule, CreateProfitRulePayload, UpdateProfitRulePayload } from '../types/profit-rule.types';

export function ProfitRulesPage() {
  const [rules, setRules] = useState<ProfitRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const data = await profitRulesService.list();
      setRules(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleCreate = async (payload: CreateProfitRulePayload) => {
    await profitRulesService.create(payload);
    await fetchRules();
  };

  const handleEdit = async (id: string, payload: UpdateProfitRulePayload) => {
    await profitRulesService.update(id, payload);
    await fetchRules();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar esta regla de ganancia?')) return;
    await profitRulesService.delete(id);
    await fetchRules();
  };

  return (
    <div style={{ paddingBottom: '150px' }}>
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
            margin: 0,
          }}
        >
          Markups de Ganancia
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.8rem',
            color: 'rgba(254, 250, 224, 0.7)',
            margin: 'var(--space-sm) 0 0',
          }}
        >
          Elegí el markup al crear o editar cada receta
        </p>
      </div>

      {/* Content */}
      <div style={{ padding: 'var(--space-lg)' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-2xl)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>
            Cargando...
          </div>
        ) : (
          <>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.8rem',
                color: 'var(--color-text-secondary)',
                margin: '0 0 var(--space-sm)',
              }}
            >
              {rules.length} {rules.length === 1 ? 'regla' : 'reglas'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {rules.map((rule) => (
                <ProfitRuleCard key={rule._id} rule={rule} onEdit={handleEdit} onDelete={handleDelete} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setModalOpen(true)}
        style={{
          position: 'fixed',
          bottom: 'calc(72px + var(--space-lg))',
          right: 'var(--space-lg)',
          background: 'var(--color-primary)',
          color: 'var(--color-on-primary)',
          border: 'none',
          borderRadius: 'var(--radius-full)',
          padding: 'var(--space-md) var(--space-lg)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-sm)',
          boxShadow: '0 4px 16px rgba(188, 108, 37, 0.4)',
          cursor: 'pointer',
          fontFamily: 'var(--font-body)',
          fontSize: '0.9rem',
          fontWeight: 600,
          zIndex: 50,
        }}
      >
        <MdAdd size={20} />
        Crear Regla
      </button>

      <ProfitRuleFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreate}
      />
    </div>
  );
}
