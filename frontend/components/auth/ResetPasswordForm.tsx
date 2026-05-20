'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { authService } from '@/services/auth-service';
import { toast } from 'sonner';
import { Lock, Loader2, Eye, EyeOff } from 'lucide-react';

interface ResetPasswordInputs {
  newPassword:  string;
  confirmPassword:  string;
}

export const ResetPasswordForm: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [isLoading, setIsLoading] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setError,
  } = useForm<ResetPasswordInputs>({
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  const newPasswordValue = watch('newPassword');

  const onSubmit = async (data: ResetPasswordInputs) => {
    if (!token) {
      setError('root.serverError', { type: 'manual', message: 'Invalid or expired parameter token reset link' });
      toast.error('Invalid reset link');
      return;
    }

    try {
      setIsLoading(true);
      await authService.resetPassword({
        token,
        newPassword: data.newPassword,
      });

      toast.success('Password reset successful! Please login.');
      router.push('/auth/login');
    } catch (error: any) {
      const errorMsg = error.response?.data?.msg || 'Password reset failed';
      toast.error(errorMsg);
      setError('root.serverError', { type: 'manual', message: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      
      {/* Root/Server Error Notification */}
      {errors.root?.serverError && (
        <div className="bg-red-50 border border-red-200/60 rounded-xl p-3.5 text-xs font-medium text-red-600">
          {errors.root.serverError.message}
        </div>
      )}

      {/* New Password Input Field */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-1">
          New Password
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-zinc-400">
            <Lock size={16} strokeWidth={2} />
          </div>
          <input
            {...register('newPassword', {
              required: 'Password validation field is required',
              minLength: {
                value: 6,
                message: 'Password must be at least 6 characters',
              },
            })}
            type={showNewPw ? 'text' : 'password'}
            disabled={isLoading}
            placeholder="••••••••"
            className={`w-full pl-11 pr-12 py-2.5 bg-white text-[13px] font-medium text-zinc-900 rounded-xl border transition-all duration-200 outline-none
              ${errors.newPassword 
                ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/5' 
                : 'border-zinc-200 focus:border-zinc-900 focus:ring-4 focus:ring-zinc-900/5'
              } disabled:opacity-60`}
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowNewPw(!showNewPw)}
            disabled={isLoading}
            className="absolute inset-y-0 right-0 px-4 flex items-center text-zinc-400 hover:text-zinc-900 transition-colors"
          >
            {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {errors.newPassword && (
          <p className="text-[11px] font-medium text-red-500 px-1 mt-0.5">
            {errors.newPassword.message}
          </p>
        )}
      </div>

      {/* Confirm Password Input Field */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-1">
          Confirm Password
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-zinc-400">
            <Lock size={16} strokeWidth={2} />
          </div>
          <input
            {...register('confirmPassword', {
              required: 'Please confirm your new password',
              validate: (value) => value === newPasswordValue || 'Passwords do not match',
            })}
            type={showConfirmPw ? 'text' : 'password'}
            disabled={isLoading}
            placeholder="••••••••"
            className={`w-full pl-11 pr-12 py-2.5 bg-white text-[13px] font-medium text-zinc-900 rounded-xl border transition-all duration-200 outline-none
              ${errors.confirmPassword 
                ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/5' 
                : 'border-zinc-200 focus:border-zinc-900 focus:ring-4 focus:ring-zinc-900/5'
              } disabled:opacity-60`}
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowConfirmPw(!showConfirmPw)}
            disabled={isLoading}
            className="absolute inset-y-0 right-0 px-4 flex items-center text-zinc-400 hover:text-zinc-900 transition-colors"
          >
            {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="text-[11px] font-medium text-red-500 px-1 mt-0.5">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      {/* Action Execution Submit Control */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full justify-center bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl py-2.5 text-xs font-semibold flex items-center gap-2 shadow-sm transition-all duration-200 hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-1"
      >
        {isLoading ? (
          <>
            <Loader2 size={14} className="animate-spin" strokeWidth={2.5} />
            Resetting Password...
          </>
        ) : (
          'Reset Password'
        )}
      </button>

      {/* Return Option */}
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