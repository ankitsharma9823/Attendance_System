'use client';
import { useState } from 'react';
import { AppSidebar } from '@/components/shared/AppSidebar';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';
import { getErrorMessage } from '@/lib/get-error-message';

export default function AddMachineUserPage() {
  // Removed employeeId from state since backend handles assignment auto-incrementally
  const [form, setForm] = useState({ name: '', role: '0' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiClient.post('/device/users', { 
        name: form.name.trim(), 
        role: parseInt(form.role, 10) 
      });
      
      if (res.data.success) {
        // Updated toast message to show the assigned ID returned from backend
        const generatedId = res.data.employeeId ? ` (Assigned ID: ${res.data.employeeId})` : '';
        toast.success((res.data.message || 'User added to machine') + generatedId);
        setForm({ name: '', role: '0' });
      } else {
        toast.error(res.data.message || 'Failed to add user');
      }
    } catch (error: any) {
      toast.error(getErrorMessage(error, 'Failed to add user'));
    } finally { setLoading(false); }
  };

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-[family-name:var(--font-outfit)]">
        {label}
      </label>
      {children}
    </div>
  );

  return (
    <AppSidebar>
      <main className="max-w-[560px] mx-auto px-4 py-8 md:py-12 font-[family-name:var(--font-outfit)] w-full">
        
        {/* Modern Header section */}
        <header className="mb-8">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1">Hardware Management</p>
          <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">Register User</h1>
          <p className="mt-1 text-[13px] text-zinc-500 dark:text-zinc-400">Provision a new profile on the biometric device.</p>
        </header>

        {/* Outer Card Wrapper */}
        <div className="bg-zinc-50/50 dark:bg-zinc-900/50 rounded-2xl p-2 shadow-sm">
          {/* Inner white block containing the standard inputs */}
          <div className="rounded-xl bg-white dark:bg-zinc-950 p-6 shadow-xs">
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              
              {/* REMOVED: Employee ID Field block from here */}

              <Field label="Full name">
                <input 
                  type="text" 
                  required 
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Anil Sharma" 
                  className="bg-zinc-50 dark:bg-zinc-900 px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 placeholder-zinc-400 border-none outline-none focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-800 transition-all" 
                />
              </Field>

              <Field label="Device role">
                <select 
                  value={form.role} 
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))} 
                  className="bg-zinc-50 dark:bg-zinc-900 px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 border-none outline-none focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-800 transition-all appearance-none cursor-pointer w-full"
                >
                  <option value="0">Normal User</option>
                  <option value="14">Admin (Super User)</option>
                </select>
              </Field>

              <button 
                type="submit" 
                disabled={loading} 
                className="mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 text-xs font-semibold shadow-xs hover:opacity-90 disabled:opacity-50 transition-all active:scale-[0.98]"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-zinc-500 border-t-white dark:border-zinc-300 dark:border-t-zinc-950 rounded-full animate-spin" />
                ) : (
                  <>
                    <UserPlus size={14} strokeWidth={2.5} />
                    <span>Add to Machine</span>
                  </>
                )}
              </button>

            </form>
          </div>
        </div>

      </main>
    </AppSidebar>
  );
}