import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { Cpu, Loader2 } from 'lucide-react'; // Added Loader2 here
import { Suspense } from 'react';

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 antialiased">
      <div className="w-full max-w-90 bg-zinc-50 border border-zinc-200/60 rounded-2xl p-6 shadow-sm">
        
        {/* Logo and Branding Header */}
        <div className="flex items-center gap-2.5 justify-center mb-6 pt-2">
          <div className="w-8 h-8 bg-zinc-900 rounded-xl flex items-center justify-center shadow-md shadow-zinc-950/10">
            <Cpu size={16} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="font-extrabold text-[16px] tracking-tight text-zinc-900">
            Attend<span className="text-zinc-400 font-medium">OS</span>
          </span>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-lg font-bold text-zinc-900">Reset Password</h1>
          <p className="text-xs text-zinc-400 mt-1 font-medium">Enter your new secure password</p>
        </div>

        {/* Wrapped in Suspense due to useSearchParams hook usage internally */}
        <Suspense 
          fallback={
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-zinc-400" size={24} />
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}