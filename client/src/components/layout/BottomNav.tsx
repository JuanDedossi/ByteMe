import { useLocation, useNavigate } from 'react-router-dom';
import {
  MdKitchen,
  MdMenuBook,
  MdTrendingUp,
  MdInventory2,
  MdCalculate,
  MdGridView,
  MdReceipt,
  MdExtension,
} from 'react-icons/md';

const USER_LABEL_KEY = 'mordisquitos-user';

const navItems = [
  { path: '/ingredientes', icon: MdKitchen, label: 'Ingredientes' },
  { path: '/recetas', icon: MdMenuBook, label: 'Recetas' },
  { path: '/markups', icon: MdTrendingUp, label: 'Markups' },
  { path: '/stock', icon: MdInventory2, label: 'Stock' },
  { path: '/bandejas', icon: MdGridView, label: 'Bandejas' },
  { path: '/complementos', icon: MdExtension, label: 'Complementos' },
  { path: '/historial', icon: MdReceipt, label: 'Historial' },
  { path: '/calculadora', icon: MdCalculate, label: 'Calculadora' },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const userLabel = localStorage.getItem(USER_LABEL_KEY);

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'rgba(254, 250, 224, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: '0 -1px 0 rgba(84, 67, 60, 0.08)',
        zIndex: 100,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {userLabel && userLabel !== 'default' && userLabel !== 'dev' && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            padding: '4px var(--space-md) 0',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.6rem',
              color: 'var(--color-text-secondary)',
              background: 'rgba(218, 193, 184, 0.3)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
            }}
          >
            {userLabel}
          </span>
        </div>
      )}
      <div
        style={{
          display: 'flex',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          padding: 'var(--space-sm) 0',
        }}
      >
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 'var(--space-xs) var(--space-md)',
                minWidth: '72px',
                flex: '1 0 auto',
                color: isActive
                  ? 'var(--color-primary)'
                  : 'var(--color-text-secondary)',
                transition: 'color 0.2s',
              }}
            >
              <Icon size={24} />
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.65rem',
                  fontWeight: isActive ? 600 : 400,
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
