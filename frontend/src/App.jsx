import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { useAthleteData } from './hooks/useAthleteData';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import MonitoringView from './pages/MonitoringView';
import PerformanceView from './pages/PerformanceView';
import RecoveryView from './pages/RecoveryView';
import AthletesOverview from './pages/AthletesOverview';
import { Menu, X } from 'lucide-react';

// Athlete metadata will be derived from realtime `summary` when available.

function Dashboard() {
  const { user } = useAuth();
  const [activePage, setActivePage] = useState('monitoring');
  const [selectedAthlete, setSelectedAthlete] = useState(
    user?.role === 'athlete' ? user.athleteId : null
  );
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { athletes, liveData, summary, connected, loading, getAthleteData, getLatest } = useAthleteData();

  // Dynamically set selected athlete when data loads for admins
  useEffect(() => {
    if (user?.role === 'admin' && !selectedAthlete && summary.length > 0) {
      setSelectedAthlete(summary[0].id);
    }
  }, [user, summary, selectedAthlete]);

  // Session timer
  useEffect(() => {
    const t = setInterval(() => setSessionSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Athlete role can only see their own data
  const viewingAthlete = user?.role === 'athlete' ? user.athleteId : selectedAthlete;
  const athleteMeta = summary.find(s => s.id === viewingAthlete) || {};
  const athleteInfo = { name: athleteMeta.name || viewingAthlete, sport: athleteMeta.sport || 'Athlete' };

  const handleSelectAthlete = (id) => {
    setSelectedAthlete(id);
    setActivePage('monitoring');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-indigo-200 border-t-accent-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="font-mono text-accent-primary font-semibold text-sm tracking-widest">CONNECTING TO SENSORS...</p>
        </div>
      </div>
    );
  }

  const pageTitle = {
    monitoring: 'Live Monitoring',
    performance: 'Performance Analytics',
    recovery: 'Recovery Dashboard',
    athletes: 'All Athletes'
  }[activePage];

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-premium-900/40 backdrop-blur-sm z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:relative z-40 lg:z-auto h-full transition-transform duration-300 shadow-premium lg:shadow-none
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <Sidebar
          active={activePage}
          onChange={(page) => { setActivePage(page); setSidebarOpen(false); }}
          connected={connected}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-surface">
        {/* Top bar */}
        <header className="flex items-center gap-4 px-6 py-4 bg-card border-b border-premium-200 shadow-sm flex-shrink-0 z-10">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-premium-500 hover:text-accent-primary transition-colors">
            <Menu size={22} />
          </button>

          <div className="flex-1">
            <h2 className="font-display text-2xl tracking-wider text-premium-900 leading-none">
              {activePage === 'athletes' ? pageTitle : user?.role === 'athlete' ? 'My Performance' : pageTitle}
            </h2>
            {activePage !== 'athletes' && (
              <p className="text-sm text-premium-500 font-medium tracking-wide mt-1">
                {user?.role === 'admin' ? `Viewing: ${athleteInfo.name} · ${athleteInfo.sport}` : `${athleteInfo.name} · ${athleteInfo.sport}`}
              </p>
            )}
          </div>

          {/* Athlete selector (admin only, not on athletes page) */}
          {user?.role === 'admin' && activePage !== 'athletes' && (
            <select
              value={viewingAthlete}
              onChange={e => setSelectedAthlete(e.target.value)}
              className="bg-card border border-premium-300 rounded-xl px-4 py-2.5 text-sm text-premium-700 font-medium shadow-sm hover:border-premium-400 focus:outline-none focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary hidden sm:block transition-all cursor-pointer"
            >
              {summary.length ? summary.map(s => (
                <option key={s.id} value={s.id}>{s.name || s.id} ({s.id})</option>
              )) : (
                <option value={viewingAthlete}>{viewingAthlete}</option>
              )}
            </select>
          )}

          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-surface-muted border border-premium-200">
            <span className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-accent-success shadow-[0_0_8px_rgba(5,150,105,0.5)] animate-pulse' : 'bg-premium-400 shadow-inner'}`} />
            <span className={`text-xs font-bold tracking-wider ${connected ? 'text-accent-success' : 'text-premium-500'}`}>
              {connected ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 max-w-7xl mx-auto w-full">
          {activePage === 'monitoring' && (
            <MonitoringView
              athleteId={viewingAthlete}
              athleteName={athleteInfo.name}
              athleteSport={athleteInfo.sport}
              getAthleteData={getAthleteData}
              getLatest={getLatest}
              sessionSeconds={sessionSeconds}
            />
          )}
          {activePage === 'performance' && (
            <PerformanceView
              athleteId={viewingAthlete}
              getAthleteData={getAthleteData}
            />
          )}
          {activePage === 'recovery' && (
            <RecoveryView
              athleteId={viewingAthlete}
              getAthleteData={getAthleteData}
              getLatest={getLatest}
            />
          )}
          {activePage === 'athletes' && user?.role === 'admin' && (
            <AthletesOverview
              summary={summary}
              liveData={liveData}
              onSelectAthlete={handleSelectAthlete}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function AppContent() {
  const { user } = useAuth();
  const [authView, setAuthView] = useState('login'); // 'login' or 'signup'

  if (user) return <Dashboard />;

  return authView === 'login'
    ? <LoginPage onToggle={() => setAuthView('signup')} />
    : <SignupPage onToggle={() => setAuthView('login')} />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
