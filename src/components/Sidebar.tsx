import { Tenant, User } from '../types';
import { 
  LayoutDashboard, 
  Send, 
  MessageSquare,
  Users, 
  Cpu, 
  Terminal, 
  CreditCard, 
  Settings, 
  ShieldAlert, 
  LogOut, 
  Building, 
  ChevronDown, 
  Wallet,
  Menu,
  X
} from 'lucide-react';

interface SidebarProps {
  tenants: Tenant[];
  activeTenant: Tenant;
  onTenantChange: (tenant: Tenant) => void;
  activeView: string;
  onViewChange: (view: string) => void;
  currentUser: User;
  onLogout: () => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (isOpen: boolean) => void;
}

export default function Sidebar({
  tenants,
  activeTenant,
  onTenantChange,
  activeView,
  onViewChange,
  currentUser,
  onLogout,
  isMobileOpen,
  setIsMobileOpen
}: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roleRequired: 'MEMBER' },
    { id: 'campaigns', label: 'Campaigns', icon: Send, roleRequired: 'MEMBER' },
    { id: 'whatsapp', label: 'WhatsApp Meta API', icon: MessageSquare, roleRequired: 'MEMBER' },
    { id: 'contacts', label: 'Contacts', icon: Users, roleRequired: 'MEMBER' },
    { id: 'automation', label: 'Automation', icon: Cpu, roleRequired: 'MEMBER' },
    { id: 'api-platform', label: 'API Platform', icon: Terminal, roleRequired: 'MANAGER' },
    { id: 'billing', label: 'Subscription & Billing', icon: CreditCard, roleRequired: 'ADMIN' },
    { id: 'settings', label: 'Settings', icon: Settings, roleRequired: 'ADMIN' },
  ];

  // System SuperAdmin view only if role is ADMIN
  const superAdminItem = { id: 'superadmin', label: 'SuperAdmin Audit', icon: ShieldAlert, roleRequired: 'ADMIN' };

  const hasAccess = (itemRole: string) => {
    if (itemRole === 'MEMBER') return true;
    if (itemRole === 'MANAGER' && (currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER')) return true;
    if (itemRole === 'ADMIN' && currentUser.role === 'ADMIN') return true;
    return false;
  };

  return (
    <>
      {/* Mobile Header */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center font-bold text-slate-950 text-sm shadow-md shadow-cyan-500/25">
            S
          </div>
          <span className="font-bold text-sm tracking-tight">SaaS Business Comm</span>
        </div>
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
        >
          {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Sidebar Overlay for Mobile */}
      {isMobileOpen && (
        <div 
          onClick={() => setIsMobileOpen(false)}
          className="lg:hidden fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40" 
        />
      )}

      {/* Main Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 lg:sticky lg:inset-0 z-40 w-64 bg-slate-950 border-r border-slate-900 flex flex-col justify-between text-slate-300 transition-transform duration-300 transform
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Workspace Brand and Tenant Switcher */}
        <div className="p-4 border-b border-slate-900 space-y-4">
          <div className="hidden lg:flex items-center gap-2.5 px-1">
            <div className="w-9 h-9 bg-gradient-to-tr from-cyan-400 to-indigo-500 rounded-xl flex items-center justify-center font-bold text-slate-950 text-base shadow-lg shadow-cyan-500/10">
              BC
            </div>
            <div>
              <h1 className="font-bold text-sm text-slate-100 tracking-tight leading-none">Enterprise Suite</h1>
              <span className="text-[10px] text-slate-500 font-mono tracking-wider">BUSINESS COMM v1.0</span>
            </div>
          </div>

          {/* Tenant Selector */}
          <div className="relative group">
            <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1 px-1">
              Active Workspace
            </label>
            <div className="relative">
              <select
                value={activeTenant.id}
                onChange={(e) => {
                  const selected = tenants.find(t => t.id === e.target.value);
                  if (selected) {
                    onTenantChange(selected);
                    setIsMobileOpen(false);
                  }
                }}
                className="w-full appearance-none bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 text-xs font-semibold py-2 px-3 pr-8 rounded-lg cursor-pointer transition-all focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-900 scrollbar-track-transparent">
          <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-2 px-2">
            Main Services
          </label>
          
          {menuItems.map((item) => {
            const isSelected = activeView === item.id;
            const access = hasAccess(item.roleRequired);
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => {
                  if (access) {
                    onViewChange(item.id);
                    setIsMobileOpen(false);
                  }
                }}
                disabled={!access}
                className={`
                  w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group cursor-pointer
                  ${isSelected 
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/15 font-semibold' 
                    : access 
                      ? 'hover:bg-slate-900 text-slate-400 hover:text-slate-200' 
                      : 'opacity-30 cursor-not-allowed text-slate-600'
                  }
                `}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-slate-950' : 'text-slate-500 group-hover:text-slate-300'}`} />
                  <span>{item.label}</span>
                </div>
                {!access && (
                  <span className="text-[9px] font-mono bg-slate-900 text-slate-500 px-1.5 py-0.5 rounded uppercase">
                    Admin
                  </span>
                )}
              </button>
            );
          })}

          {/* SuperAdmin Panel Section if admin */}
          {currentUser.role === 'ADMIN' && (
            <div className="pt-4 mt-4 border-t border-slate-900 space-y-1.5">
              <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-2 px-2">
                Platform Operations
              </label>
              <button
                onClick={() => {
                  onViewChange(superAdminItem.id);
                  setIsMobileOpen(false);
                }}
                className={`
                  w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer
                  ${activeView === superAdminItem.id 
                    ? 'bg-rose-500 text-slate-950 shadow-md shadow-rose-500/15 font-semibold' 
                    : 'hover:bg-slate-900 text-rose-400 hover:text-rose-300'
                  }
                `}
              >
                <superAdminItem.icon className="w-4 h-4" />
                <span>{superAdminItem.label}</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer Wallet Info & Session Info */}
        <div className="p-4 border-t border-slate-900 space-y-4">
          {/* SMS Wallet Status */}
          <div className="bg-slate-900/60 border border-slate-850 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5 text-cyan-400" /> Wallet Balance
              </span>
              <span className="text-cyan-400 font-semibold uppercase">{activeTenant.plan}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-mono text-slate-400">KES</span>
              <span className="text-lg font-bold font-mono text-slate-100">
                {activeTenant.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            {activeTenant.balance === 0 && (
              <p className="text-[10px] text-amber-400 leading-none mt-1 animate-pulse">
                SMS queue paused. Wallet empty.
              </p>
            )}
          </div>

          {/* User Session profile info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 text-xs font-semibold text-slate-300">
                {currentUser.firstName[0]}{currentUser.lastName[0]}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-slate-200 truncate leading-none">
                  {currentUser.firstName} {currentUser.lastName}
                </p>
                <span className="text-[9px] font-mono text-slate-500 uppercase">
                  {currentUser.role}
                </span>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
