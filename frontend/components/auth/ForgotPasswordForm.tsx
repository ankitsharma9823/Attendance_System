'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { authService } from '@/services/auth-service';
import { toast } from 'sonner';
import { Mail, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';

interface ForgotPasswordInputs {
  email: string;
}

export const ForgotPasswordForm: React.FC = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setError,
  } = useForm<ForgotPasswordInputs>({
    defaultValues: { email: '' },
  });

  const emailValue = watch('email');

  const onSubmit = async (data: ForgotPasswordInputs) => {
    try {
      setIsLoading(true);
      await authService.forgotPassword({ email: data.email });
      toast.success('Password reset link sent to your email!');
      setSubmitted(true);
    } catch (error: any) {
      const errorMsg = error.response?.data?.msg || 'Failed to send reset email';
      toast.error(errorMsg);
      setError('root.serverError', { type: 'manual', message: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col gap-4 animate-in fade-in-50 duration-200">
        <div className="bg-emerald-50 border border-emerald-200/60 rounded-xl p-4 text-center">
          <div className="flex justify-center text-emerald-600 mb-2">
            <CheckCircle2 size={24} strokeWidth={2.5} />
          </div>
          <p className="text-[13px] font-bold text-emerald-800">Check your email</p>
          <p className="text-xs text-emerald-600/90 mt-1 font-medium leading-relaxed">
            We've sent a password reset link to <br />
            <strong className="text-emerald-700 font-semibold break-all">{emailValue}</strong>
          </p>
        </div>

        <button
          onClick={() => router.push('/auth/login')}
          className="w-full justify-center bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl py-2.5 text-xs font-semibold flex items-center gap-2 shadow-sm transition-all duration-200 hover:shadow-md active:scale-[0.98]"
        >
          <ArrowLeft size={14} strokeWidth={2.5} />
          Back to Login
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      
      {/* Informational Header Alert */}
      <div className="bg-zinc-100/80 border border-zinc-200/50 rounded-xl p-3 text-[12px] font-medium text-zinc-500 leading-relaxed">
        Enter your email address and we'll send you a link to reset your password.
      </div>

      {/* Root/Server Handling Catch */}
      {errors.root?.serverError && (
        <div className="bg-red-50 border border-red-200/60 rounded-xl p-3.5 text-xs font-medium text-red-600">
          {errors.root.serverError.message}
        </div>
      )}

      {/* Input Group Container */}
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

      {/* Primary Execution Control */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full justify-center bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl py-2.5 text-xs font-semibold flex items-center gap-2 shadow-sm transition-all duration-200 hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-1"
      >
        {isLoading ? (
          <>
            <Loader2 size={14} className="animate-spin" strokeWidth={2.5} />
            Sending Link...
          </>
        ) : (
          'Send Reset Link'
        )}
      </button>

      {/* Alternate Routing Controls */}
      <div className="text-center mt-1">
        <a
          href="/auth/login"
          className="text-xs font-semibold text-zinc-400 hover:text-zinc-900 transition-colors duration-200"
        >
          Back to Login
        </a>
      </div>
    </form>
  );
};