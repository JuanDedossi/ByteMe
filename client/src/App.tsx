import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { BottomNav } from './components/layout/BottomNav';
import { PinScreen } from './components/auth/PinScreen';
import { CalculatorPage } from './pages/CalculatorPage';
import { IngredientsPage } from './pages/IngredientsPage';
import { ProfitRulesPage } from './pages/ProfitRulesPage';
import { RecipesPage } from './pages/RecipesPage';
import { StockSalesPage } from './pages/StockSalesPage';
import { TraysPage } from './pages/TraysPage';
import { SalesHistoryPage } from './pages/SalesHistoryPage';

const TOKEN_KEY = 'mordisquitos-token';

function ProtectedRoute() {
  const location = useLocation();
  const isAuthenticated = !!localStorage.getItem(TOKEN_KEY);
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return (
    <>
      <Outlet />
      <BottomNav />
    </>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<PinScreen />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Navigate to="/ingredientes" replace />} />
        <Route path="/ingredientes" element={<IngredientsPage />} />
        <Route path="/recetas" element={<RecipesPage />} />
        <Route path="/markups" element={<ProfitRulesPage />} />
        <Route path="/stock" element={<StockSalesPage />} />
        <Route path="/bandejas" element={<TraysPage />} />
        <Route path="/historial" element={<SalesHistoryPage />} />
        <Route path="/calculadora" element={<CalculatorPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
