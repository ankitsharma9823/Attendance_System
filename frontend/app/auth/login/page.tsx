import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 antialiased">
      <div className="w-full max-w-90 bg-zinc-50 border border-zinc-200/60 rounded-2xl p-6 shadow-sm">
        
        {/* Logo and Branding Header */}
        <div className="flex items-center gap-2.5 justify-center mb-8 pt-2">
            <span className="font-bold text-16px uppercase text-zinc-900 text-xl tracking-wider md:text-2xl">
          Aara<span className='text-[#964394]'>mbha</span>
        </span>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}