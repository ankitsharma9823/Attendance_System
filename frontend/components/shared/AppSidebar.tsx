'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, 
  SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton,
  SidebarProvider, SidebarTrigger
} from "@/components/ui/sidebar";
import {
  LayoutDashboard, History, Settings, Users, LogOut
} from 'lucide-react';
import { ModeToggle } from '../theme-toggle';
export const AppSidebar = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading, user, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/auth/login');
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) return <>{children}</>;

  const navItems = [
    { href: '/', label: 'Overview', icon: LayoutDashboard },
    { href: '/attendance', label: 'Attendance', icon: History },
    { href: '/holiday', label: 'Message', icon: History },
    
  ];

  const adminItems = user?.role === 'admin' ? [
    { href: '/device/users', label: 'Users', icon: Users },
    { href: '/schedule', label: 'Setting', icon: Settings },
    { href: '/admin_message', label: 'Reply', icon: Settings },
  ] : [];

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="p-4">
          <span className="font-bold text-xl uppercase tracking-wider">
            Aara<span className='text-[#964394]'>mbha</span>
          </span>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href}>
                    <Link href={item.href}>
                      <item.icon /> {item.label}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>

          {adminItems.length > 0 && (
            <SidebarGroup>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={pathname === item.href}>
                      <Link href={item.href}>
                        <item.icon /> {item.label}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          )}
        </SidebarContent>

        <SidebarFooter className="p-4">
          <div className="flex items-center justify-between gap-2 px-2 pb-2">
    <span className="text-xs font-medium text-zinc-500">Theme</span>
    <ModeToggle />
  </div>
           <SidebarMenuButton onClick={logout}>
             <LogOut /> Sign Out
           </SidebarMenuButton>
        </SidebarFooter>
      </Sidebar>
      
      <main className="flex-1">
        <div className="p-4 lg:hidden">
            <SidebarTrigger />
        </div>
        {children}
      </main>
    </SidebarProvider>
  );
};