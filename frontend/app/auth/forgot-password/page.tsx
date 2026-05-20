import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { Cpu } from 'lucide-react';

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 antialiased">
      <div className="w-full max-w-[360px] bg-zinc-50 border border-zinc-200/60 rounded-2xl p-6 shadow-sm">
        
        {/* Logo and Branding Header */}
        <div className="flex items-center gap-[10px] justify-center mb-6 pt-2">
          <div className="w-8 h-8 bg-zinc-900 rounded-xl flex items-center justify-center shadow-md shadow-zinc-950/10">
            <Cpu size={16} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="font-extrabold text-[16px] tracking-tight text-zinc-900">
            Attend<span className="text-zinc-400 font-medium">OS</span>
          </span>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-lg font-bold text-zinc-900">Forgot Password?</h1>
          <p className="text-xs text-zinc-400 mt-1 font-medium">We'll help you reset your password</p>
        </div>

        <ForgotPasswordForm />
      </div>
    </div>
  );
}