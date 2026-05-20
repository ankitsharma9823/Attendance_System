import { LoginForm } from '@/components/auth/LoginForm';
import { Cpu } from 'lucide-react';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 antialiased">
      <div className="w-full max-w-[360px] bg-zinc-50 border border-zinc-200/60 rounded-2xl p-6 shadow-sm">
        
        {/* Logo and Branding Header */}
        <div className="flex items-center gap-[10px] justify-center mb-8 pt-2">
          <span className="font-extrabold text-[16px] tracking-tight text-zinc-900">
            AttendanceY
          </span>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}