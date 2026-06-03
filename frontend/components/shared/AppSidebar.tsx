'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import {
  LayoutDashboard, History, UserPlus, Settings,
  Users, UserCog, TrendingUp, Clock, LogOut, Cpu, Menu, X
} from 'lucide-react';

export const AppSidebar = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/auth/login');
  }, [isAuthenticated, isLoading, router]);

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  if (isLoading) return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <div className="text-center">
        <div className="animate-spin mx-auto mb-4 h-8 w-8 rounded-full border-2 border-zinc-200 border-t-zinc-900" />
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Authenticating</p>
      </div>
    </div>
  );

  if (!isAuthenticated) return null;

  const navItems = [
    { href: '/', label: 'Overview', icon: LayoutDashboard },
    { href: '/attendance/today', label: "Today", icon: Clock },
    { href: '/attendance', label: 'Ledger', icon: History },
    { href: '/employees/stats', label: 'Analytics', icon: TrendingUp },
  ];

  const adminItems = user?.role === 'admin' ? [
    { href: '/schedule', label: 'Schedule', icon: Settings },
    { href: '/users/add', label: 'Add App User', icon: UserPlus },
    { href: '/device/users', label: 'Machine Users', icon: Users },
    { href: '/device/users/add', label: 'Add Machine User', icon: UserCog },
  ] : [];

  const initials = user?.username?.slice(0, 2).toUpperCase() || 'US';

  const NavLink = ({ href, label, icon: Icon }: { href: string; label: string; icon: any }) => {
    const active = pathname === href;
    return (
      <Link 
        href={href} 
        onClick={() => setIsOpen(false)}
        className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200
          ${active 
            ? 'text-zinc-900 bg-white shadow-sm font-semibold' 
            : 'text-zinc-500 bg-transparent hover:text-zinc-900 hover:bg-zinc-200/50'
          }`}
      >
        <Icon size={16} strokeWidth={active ? 2.5 : 2} />
        {label}
      </Link>
    );
  };

  const sidebarContent = (
    <aside className="w-60 h-full flex flex-col bg-zinc-50 px-4 py-6">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3 py-1 mb-8">
        <div className="w-8 h-8 bg-zinc-900 rounded-xl flex items-center justify-center shadow-md shadow-zinc-950/10">
          <Cpu size={16} className="text-white" strokeWidth={2.5} />
        </div>
        <span className="font-extrabold text-16px tracking-tight text-zinc-900">
          Attend<span className="text-zinc-400 font-medium">OS</span>
        </span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 flex flex-col gap-6 overflow-y-auto">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-4 mb-2">Navigation</p>
          <div className="flex flex-col gap-1">
            {navItems.map(item => <NavLink key={item.href} {...item} />)}
          </div>
        </div>
        
        {adminItems.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-4 mb-2">Admin</p>
            <div className="flex flex-col gap-1">
              {adminItems.map(item => <NavLink key={item.href} {...item} />)}
            </div>
          </div>
        )}
      </nav>

      {/* User footer */}
      <div className="pt-4 mt-4 bg-zinc-100/50 rounded-2xl p-3 shadow-inner">
        <div className="flex items-center gap-2.5 mb-3 px-1">
          <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center font-mono text-[11px] font-semibold text-zinc-800 shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-zinc-800 overflow-hidden text-ellipsis whitespace-nowrap">{user?.username}</p>
            <p className="text-[11px] text-zinc-400 font-medium capitalize">{user?.role}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="w-full justify-center bg-white hover:bg-zinc-100 text-zinc-700 rounded-xl py-2 text-xs font-semibold flex items-center gap-2 shadow-sm transition-all duration-200 hover:shadow-md active:scale-95">
          <LogOut size={13} />
          Sign Out
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen bg-zinc-100 relative antialiased">
      
      {/* Mobile navigation toggle */}
      <div className="fixed top-4 right-4 z-50 lg:hidden">
        <button onClick={() => setIsOpen(!isOpen)} className="p-2.5 shadow-md rounded-xl bg-white text-zinc-700 active:scale-95 transition-transform">
          {isOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile background dim overlay */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)} 
          className="fixed inset-0 z-40 bg-zinc-950/20 backdrop-blur-md lg:hidden" 
        />
      )}

      {/* Sidebar Desktop/Mobile Wrapper */}
      <div className={`
        fixed inset-y-0 left-0 z-40 transition-transform duration-300 ease-out
        lg:sticky lg:translate-x-0 lg:h-screen lg:sticky lg:top-0 shrink-0
        ${isOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full'}
      `}>
        {sidebarContent}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 px-4 py-6 lg:px-10">
        {children}
      </div>
    </div>
  );
};