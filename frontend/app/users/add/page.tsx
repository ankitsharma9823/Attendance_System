'use client';

import { AppSidebar } from '@/components/shared/AppSidebar';
import { AdminRegisterForm } from '@/components/auth/AdminRegisterForm';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AddUserPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user?.role !== 'admin') {
      router.push('/');
    }
  }, [user, isLoading, router]);

  return (
    <AppSidebar>
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-zinc-400">Administration</p>
          <h1 className="mt-2 text-4xl font-black text-zinc-950">Add App User</h1>
          <p className="mt-2 text-sm text-zinc-600">Register a new user for the web dashboard.</p>
        </header>

        <section className="rounded-md border border-zinc-200 bg-white p-6 shadow-sm">
          <AdminRegisterForm />
        </section>
      </main>
    </AppSidebar>
  );
}
