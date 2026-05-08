import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TrackWiseProvider, useTrackWise } from './context/TrackWiseContext';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Transactions } from './components/Transactions';
import { History } from './components/History';
import { Inventory } from './components/Inventory';
import { Categories } from './components/Categories';
import { Reports } from './components/Reports';
import { Approvals } from './components/Approvals';
import { UserManagement } from './components/UserManagement';
import { Profile } from './components/Profile';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';
import { UserRole } from './types';

// Tab access map
const TAB_ACCESS: Record<string, UserRole[]> = {
  dashboard:    ['Admin', 'Accountant', 'Viewer'],
  transactions: ['Admin', 'Accountant'],
  history:      ['Admin', 'Accountant', 'Viewer'],
  inventory:    ['Admin', 'Accountant'],
  categories:   ['Admin'],
  reports:      ['Admin', 'Accountant', 'Viewer'],
  approvals:    ['Admin', 'Accountant'],
  users:        ['Admin'],
  profile:      ['Admin', 'Accountant', 'Viewer'],
};

// Inner app content (authenticated)
const AppContent: React.FC = () => {
  const { activeTab, setActiveTab } = useTrackWise();
  const { session, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const role = session?.role ?? 'Viewer';

  // Auto-redirect away from disallowed tabs
  React.useEffect(() => {
    const allowed = TAB_ACCESS[activeTab];
    if (!allowed || !allowed.includes(role)) {
      setActiveTab('dashboard');
    }
  }, [activeTab, role, setActiveTab]);

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':    return <Dashboard />;
      case 'transactions': return <Transactions />;
      case 'history':      return <History />;
      case 'inventory':    return <Inventory />;
      case 'categories':   return <Categories />;
      case 'reports':      return <Reports />;
      case 'approvals':    return <Approvals />;
      case 'users':        return <UserManagement />;
      case 'profile':      return <Profile />;
      default:             return <Dashboard />;
    }
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'dashboard':    return 'Command Center';
      case 'transactions': return 'New Transaction';
      case 'history':      return 'Audit Logs & Ledger History';
      case 'inventory':    return 'Stock Inventory Control';
      case 'categories':   return 'Financial Category Manager';
      case 'reports':      return 'Reports & Business Intelligence';
      case 'approvals':    return role === 'Admin' ? 'Pending Approvals' : 'My Approval Requests';
      case 'users':        return 'User & Access Management';
      case 'profile':      return 'Profile Settings';
      default:             return 'TrackWise Workspace';
    }
  };

  const roleColors: Record<UserRole, string> = {
    Admin:      'bg-emerald-50 text-emerald-700 border-emerald-200',
    Accountant: 'bg-blue-50 text-blue-700 border-blue-200',
    Viewer:     'bg-slate-100 text-slate-600 border-slate-200',
  };

  return (
    <div className="flex bg-slate-50 min-h-screen text-slate-600 font-sans print:bg-white">
      {/* Fixed sidebar */}
      <div className="print:hidden fixed top-0 left-0 h-full z-40">
        <Sidebar />
      </div>

      {/* Main content */}
      <main className="flex-1 ml-64 flex flex-col min-w-0 print:ml-0">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 px-8 py-4 flex items-center justify-between print:hidden sticky top-0 z-30">
          <div>
            <span className="text-[11px] font-extrabold tracking-widest text-emerald-600 uppercase">
              {session?.businessName}
            </span>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight leading-none mt-0.5">
              {getTabTitle()}
            </h2>
          </div>

          <div className="relative flex items-center gap-3">
            <button
              onClick={() => setShowUserMenu((v) => !v)}
              className="flex items-center gap-2.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-emerald-400 font-black text-xs uppercase">
                {session?.username?.charAt(0) ?? '?'}
              </div>
              <div className="text-left hidden md:block">
                <p className="text-xs font-bold text-slate-800 leading-tight">@{session?.username}</p>
                <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-md border mt-0.5 leading-none ${roleColors[role]}`}>
                  {role}
                </span>
              </div>
              <svg className="w-3.5 h-3.5 text-slate-400 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
                <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 overflow-hidden animate-zoom-in">
                  <div className="px-5 py-4 bg-slate-50 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-emerald-400 font-black text-sm uppercase">
                        {session?.username?.charAt(0) ?? '?'}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">@{session?.username}</p>
                        <p className="text-xs text-slate-500 font-medium">{session?.ownerName}</p>
                        <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-md border mt-1 leading-none ${roleColors[role]}`}>
                          {role}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Business</p>
                      <p className="text-xs font-bold text-slate-700 mt-0.5">{session?.businessName}</p>
                    </div>
                  </div>
                  <div className="p-2">
                    <button
                      onClick={() => { setShowUserMenu(false); logout(); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign Out of Workspace
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        <div className="p-8 flex-1 max-w-7xl w-full mx-auto print:p-0">
          {renderActiveTab()}
        </div>
      </main>
    </div>
  );
};

// Auth gate wrapper
const AuthGate: React.FC = () => {
  const { session } = useAuth();
  const [view, setView] = useState<'login' | 'register'>('login');

  if (!session) {
    return view === 'login'
      ? <LoginPage onGoToRegister={() => setView('register')} />
      : <RegisterPage onGoToLogin={() => setView('login')} />;
  }

  if (session.mustChangePassword) {
    return <ChangePasswordPage />;
  }

  return (
    <TrackWiseProvider>
      <AppContent />
    </TrackWiseProvider>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}
