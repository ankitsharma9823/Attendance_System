import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { Cpu } from 'lucide-react';

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 antialiased">
      <div className="w-full max-w-[360px] bg-zinc-50 border border-zinc-200/60 rounded-2xl p-6 shadow-sm">
        
        {/* Logo and Branding Header */}
        <div className="flex items-center gap-[10px] justify-center mb-6 pt-2">
            <span className="font-bold text-16px uppercase text-zinc-900 text-xl tracking-wider md:text-2xl">
          Aara<span className='text-[#964394]'>mbha</span>
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