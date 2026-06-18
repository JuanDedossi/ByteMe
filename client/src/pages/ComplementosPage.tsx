import { useState, useEffect, useCallback } from 'react';
import { MdAdd } from 'react-icons/md';
import { ComplementList } from '../components/complementos/ComplementList';
import { ComplementFormModal } from '../components/complementos/ComplementFormModal';
import { SearchBar } from '../components/common/SearchBar';
import { Pagination } from '../components/common/Pagination';
import { complementsService } from '../services/complements.service';
import type {
  Complement,
  CreateComplementPayload,
  UpdateComplementPayload,
} from '../types/complement.types';

export function ComplementosPage() {
  const [complements, setComplements] = useState<Complement[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Complement | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const limit = 10;

  const fetchComplements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await complementsService.list({
        page,
        limit,
        search: search || undefined,
      });
      setComplements(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setErrorMessage(err?.response?.data?.message || 'Error al cargar los complementos');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const timer = setTimeout(fetchComplements, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchComplements, search]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleCreate = async (payload: CreateComplementPayload | UpdateComplementPayload) => {
    await complementsService.create(payload as CreateComplementPayload);
    setCreateOpen(false);
    setErrorMessage('');
    await fetchComplements();
  };

  const handleEdit = async (payload: UpdateComplementPayload) => {
    if (!editing) return;
    await complementsService.update(editing._id, payload);
    setEditing(null);
    setErrorMessage('');
    await fetchComplements();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar este complemento?')) return;
    setErrorMessage('');
    try {
      await complementsService.delete(id);
      await fetchComplements();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      const apiMessage = err?.response?.data?.message;
      // 409 from backend = delete protection (used by recipes/trays).
      if (apiMessage) {
        setErrorMessage(`${apiMessage}. Si no lo usás más, desactivá el complemento.`);
      } else {
        setErrorMessage('No se pudo eliminar el complemento. Intentá de nuevo.');
      }
    }
  };

  const handleToggleActive = async (id: string) => {
    setErrorMessage('');
    try {
      await complementsService.toggleActive(id);
      await fetchComplements();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setErrorMessage(err?.response?.data?.message || 'No se pudo cambiar el estado');
    }
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
            margin: '0 0 var(--space-md)',
          }}
        >
          Complementos
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.8rem',
            color: 'rgba(254, 250, 224, 0.7)',
            margin: '0 0 var(--space-md)',
          }}
        >
          Packaging y decoración (bandejas, telas, moños)
        </p>
        <SearchBar
          value={search}
          onChange={handleSearch}
          placeholder="Buscar complemento..."
        />
      </div>

      {/* Content */}
      <div style={{ padding: 'var(--space-lg)' }}>
        {/* Count */}
        {!loading && (
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.8rem',
              color: 'var(--color-text-secondary)',
              margin: '0 0 var(--space-md)',
            }}
          >
            {total} {total === 1 ? 'complemento' : 'complementos'}
            {search && ` para "${search}"`}
          </p>
        )}

        {/* Error banner */}
        {errorMessage && (
          <div
            role="alert"
            style={{
              background: '#fde8e8',
              border: '1px solid var(--color-error)',
              borderRadius: 'var(--radius-sm)',
              padding: 'var(--space-sm) var(--space-md)',
              marginBottom: 'var(--space-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 'var(--space-sm)',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.85rem',
                color: 'var(--color-error)',
                flex: 1,
              }}
            >
              {errorMessage}
            </span>
            <button
              onClick={() => setErrorMessage('')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-error)',
                fontFamily: 'var(--font-body)',
                fontSize: '0.85rem',
                fontWeight: 600,
                padding: 0,
              }}
              aria-label="Cerrar mensaje"
            >
              ×
            </button>
          </div>
        )}

        {/* List */}
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
        ) : complements.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: 'var(--space-2xl)',
              color: 'var(--color-text-secondary)',
              fontFamily: 'var(--font-body)',
            }}
          >
            {search
              ? `No se encontraron complementos para "${search}"`
              : 'Aún no hay complementos. Creá el primero.'}
          </div>
        ) : (
          <ComplementList
            complements={complements}
            onEdit={setEditing}
            onDelete={handleDelete}
            onToggleActive={handleToggleActive}
          />
        )}

        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {/* FAB */}
      <button
        onClick={() => setCreateOpen(true)}
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
        Crear Complemento
      </button>

      <ComplementFormModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
      />

      <ComplementFormModal
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        onSubmit={handleEdit}
        initialData={editing}
      />
    </div>
  );
}
