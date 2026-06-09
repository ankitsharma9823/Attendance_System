'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/context/auth-context';
import { toast } from 'sonner';
import axios from 'axios';
import { AuthResponse } from '@/types/auth';
import { getErrorMessage } from '@/lib/get-error-message';
import { Eye, EyeOff, Lock, Mail, Loader2 } from 'lucide-react';

interface LoginFormInputs {
  email: string;
  password:  string;
}

export const LoginForm: React.FC = () => {
  const router = useRouter();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginFormInputs>({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormInputs) => {
    try {
      setIsLoading(true);
      await login(data.email, data.password);
      toast.success('Access granted');
      router.push('/attendance');
    } catch (error: unknown) {
      const msg = getErrorMessage(error, 'Authentication failed');
      
      if (axios.isAxiosError<AuthResponse>(error) && error.response?.data?.code === 'EMAIL_NOT_VERIFIED') {
        const email = error.response.data.email || data.email;
        toast.error(msg);
        setIsLoading(false); // Clear execution state before shifting routes
        router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`);
        return;
      }
      
      toast.error(msg);
      setError('root.serverError', { type: 'manual', message: msg });
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      
      {/* Root/Server Error Notification */}
      {errors.root?.serverError && (
        <div className="bg-red-50 border border-red-200/60 rounded-xl p-3.5 text-xs font-medium text-red-600 animate-in fade-in-50 duration-200">
          {errors.root.serverError.message}
        </div>
      )}

      {/* Email Input Field Group */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-1">
          Email address
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-zinc-400">
            <Mail size={16} strokeWidth={2} />
          </div>
          <input
            {...register('email', {
              required: 'Email address is required',
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Enter a valid email address',
              },
            })}
            type="email"
            disabled={isLoading}
            placeholder="operator@system.node"
            className={`w-full pl-11 pr-4 py-2.5 bg-white text-[13px] font-medium text-zinc-900 rounded-xl border transition-all duration-200 outline-none
              ${errors.email 
                ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/5' 
                : 'border-zinc-200 focus:border-zinc-900 focus:ring-4 focus:ring-zinc-900/5'
              } disabled:opacity-60`}
          />
        </div>
        {errors.email && (
          <p className="text-[11px] font-medium text-red-500 px-1 mt-0.5">
            {errors.email.message}
          </p>
        )}
      </div>

      {/* Password Input Field Group */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-1">
          Password
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-zinc-400">
            <Lock size={16} strokeWidth={2} />
          </div>
          <input
            {...register('password', {
              required: 'Password is required',
            })}
            type={showPw ? 'text' : 'password'}
            disabled={isLoading}
            placeholder="••••••••"
            className={`w-full pl-11 pr-12 py-2.5 bg-white text-[13px] font-medium text-zinc-900 rounded-xl border transition-all duration-200 outline-none
              ${errors.password 
                ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/5' 
                : 'border-zinc-200 focus:border-zinc-900 focus:ring-4 focus:ring-zinc-900/5'
              } disabled:opacity-60`}
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPw(!showPw)}
            disabled={isLoading}
            className="absolute inset-y-0 right-0 px-4 flex items-center text-zinc-400 hover:text-zinc-900 transition-colors disabled:opacity-50"
          >
            {showPw ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
          </button>
        </div>
        {errors.password && (
          <p className="text-[11px] font-medium text-red-500 px-1 mt-0.5">
            {errors.password.message}
          </p>
        )}
      </div>

      {/* Action Execution Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full justify-center bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl py-2.5 text-xs font-semibold flex items-center gap-2 shadow-sm transition-all duration-200 hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-2"
      >
        {isLoading ? (
          <>
            <Loader2 size={14} className="animate-spin" strokeWidth={2.5} />
            Signing In...
          </>
        ) : (
          'Sign In'
        )}
      </button>

      {/* Recovery Account Navigation Link */}
      <div className="text-center mt-1">
        <a
          href="/auth/forgot-password"
          className="text-xs font-semibold text-zinc-400 hover:text-zinc-900 transition-colors duration-200"
        >
          Forgot Password?
        </a>
      </div>
    </form>
  );
};