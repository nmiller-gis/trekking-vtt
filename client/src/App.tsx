import { useEffect } from 'react';
import { useSocketSetup } from './hooks/useSocket';
import { useUIStore } from './store/uiStore';
import { useAuthStore } from './store/authStore';
import AuthView from './components/layout/AuthView';
import DashboardView from './components/layout/DashboardView';
import StationSelector from './components/layout/StationSelector';
import MainLayout from './components/layout/MainLayout';

export default function App() {
  useSocketSetup();
  const view = useUIStore((s) => s.view);
  const setView = useUIStore((s) => s.setView);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (view === 'auth' && isAuthenticated) {
      setView('dashboard');
    }
  }, [isAuthenticated, view, setView]);

  return (
    <div className="h-full w-full flex flex-col bg-lcars-bg text-white font-lcars">
      {(view === 'auth' || !isAuthenticated) && <AuthView />}
      {view === 'dashboard' && isAuthenticated && <DashboardView />}
      {view === 'station-select' && isAuthenticated && <StationSelector />}
      {view === 'play' && isAuthenticated && <MainLayout />}
    </div>
  );
}
