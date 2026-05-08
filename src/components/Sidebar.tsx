import React from 'react';
import { useTrackWise } from '../context/TrackWiseContext';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import {
  LayoutDashboard, Receipt, History, BarChart3, Tags, Package,
  AlertTriangle, ShieldCheck, Users, ClipboardList, UserCog,
} from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
  badge?: number | null;
}

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, inventory, approvals } = useTrackWise();
  const { session } = useAuth();
  const role = session?.role ?? 'Viewer';

  const lowStockCount = inventory.filter((item) => item.quantity <= item.lowStockThreshold).length;
  const pendingApprovals = approvals.filter((a) => a.status === 'pending').length;
  const myPending = approvals.filter((a) => a.status === 'pending' && a.requestedBy === session?.username).length;

  const allMenu: MenuItem[] = [
    { id: 'dashboard',   name: 'Dashboard',          icon: LayoutDashboard, roles: ['Admin', 'Accountant', 'Viewer'] },
    { id: 'transactions',name: 'New Transaction',    icon: Receipt,         roles: ['Admin', 'Accountant'] },
    { id: 'history',     name: 'Transaction History',icon: History,         roles: ['Admin', 'Accountant', 'Viewer'] },
    { id: 'inventory',   name: 'Inventory Tracker',  icon: Package,         roles: ['Admin', 'Accountant'], badge: lowStockCount || null },
    { id: 'categories',  name: 'Categories Manager', icon: Tags,            roles: ['Admin'] },
    { id: 'reports',     name: 'Reports & Export',   icon: BarChart3,       roles: ['Admin', 'Accountant', 'Viewer'] },
    { id: 'approvals',   name: role === 'Admin' ? 'Approvals' : 'My Pending Approvals',
                         icon: role === 'Admin' ? ShieldCheck : ClipboardList,
                         roles: ['Admin', 'Accountant'],
                         badge: role === 'Admin' ? (pendingApprovals || null) : (myPending || null) },
    { id: 'users',       name: 'User Management',    icon: Users,           roles: ['Admin'] },
    { id: 'profile',     name: 'Profile',            icon: UserCog,         roles: ['Admin', 'Accountant', 'Viewer'] },
  ];

  const menuItems = allMenu.filter((m) => m.roles.includes(role));

  return (
    <div className="w-64 bg-slate-900 text-white flex flex-col h-full border-r border-slate-800">
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="bg-emerald-500 p-2 rounded-xl text-slate-900 font-black tracking-wider shadow-lg shadow-emerald-500/20">
          TW
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            TrackWise
          </h1>
          <p className="text-xs text-slate-400 font-medium">Finance & Stock Hub</p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const isApprovalsTab = item.id === 'approvals';
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all font-medium text-sm group ${
                isActive
                  ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/10'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-slate-950' : 'text-slate-400 group-hover:text-emerald-400 transition-colors'}`} />
                <span className="truncate">{item.name}</span>
              </div>

              {item.badge ? (
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full flex items-center gap-1 ${
                  isActive
                    ? 'bg-slate-950 text-amber-400'
                    : isApprovalsTab
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}>
                  {!isApprovalsTab && <AlertTriangle className="w-3 h-3" />}
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-3 p-2 rounded-xl">
          <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center font-bold text-emerald-400 text-sm border border-slate-600">
            {session?.username?.charAt(0).toUpperCase() ?? '?'}
          </div>
          <div className="overflow-hidden">
            <h4 className="text-xs font-semibold text-slate-200 truncate">{session?.ownerName ?? 'Guest'}</h4>
            <p className="text-[10px] text-slate-500 truncate">{role} access</p>
          </div>
        </div>
      </div>
    </div>
  );
};
