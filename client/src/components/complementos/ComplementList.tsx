import type { Complement } from '../../types/complement.types';
import { ComplementRow } from './ComplementRow';

interface ComplementListProps {
  complements: Complement[];
  onEdit: (complement: Complement) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string) => void;
}

export function ComplementList({ complements, onEdit, onDelete, onToggleActive }: ComplementListProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
      {complements.map((complement) => (
        <ComplementRow
          key={complement._id}
          complement={complement}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleActive={onToggleActive}
        />
      ))}
    </div>
  );
}
