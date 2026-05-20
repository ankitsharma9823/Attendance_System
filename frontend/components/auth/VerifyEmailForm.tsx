'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { authService } from '@/services/auth-service';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/get-error-message';
import { Cpu, Loader2 } from 'lucide-react';

interface VerifyEmailInputs {
  otp: string;
}

export const VerifyEmailForm: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';

  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    clearErrors,
  } = useForm<VerifyEmailInputs>({
    defaultValues: { otp: '' },
  });

  const onSubmit = async (data: VerifyEmailInputs) => {
    try {
      setIsLoading(true);
      await authService.verifyEmail({
        email,
        otp: data.otp.trim(),
      });

      toast.success('Email verified successfully! You can now login.');
      router.push('/auth/login');
    } catch (error: unknown) {
      const errorMsg = getErrorMessage(error, 'Verification failed');
      toast.error(errorMsg);
      setError('otp', { type: 'manual', message: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      const errorMsg = 'Email parameter is missing. Re-initiate login layout.';
      toast.error(errorMsg);
      setError('root.serverError', { type: 'manual', message: errorMsg });
      return;
    }

    try {
      setIsResending(true);
      clearErrors();
      const response = await authService.resendVerification(email);
      toast.success(response.msg || 'Verification code resent');
    } catch (error: unknown) {
      const errorMsg = getErrorMessage(error, 'Failed to resend verification code');
      toast.error(errorMsg);
      setError('root.serverError', { type: 'manual', message: errorMsg });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      
      {/* Target Address Destination Tracker Label banner */}
      <div className="bg-zinc-100/80 border border-zinc-200/50 rounded-xl p-3 text-[12px] font-medium text-zinc-500 leading-relaxed text-center">
        Verification code sent to: <br />
        <strong className="text-zinc-900 font-semibold break-all">{email || 'unknown@target.node'}</strong>
      </div>

      {/* Root/Resend Server Errors */}
      {errors.root?.serverError && (
        <div className="bg-red-50 border border-red-200/60 rounded-xl p-3.5 text-xs font-medium text-red-600">
          {errors.root.serverError.message}
        </div>
      )}

      {/* OTP Single Parameter Form Target Input Group */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-center mb-1">
          Enter 6-Digit Code
        </label>
        <div className="relative">
          <input
            {...register('otp', {
              required: 'Verification code input missing',
              minLength: { value: 6, message: 'Code must be exactly 6 digits' },
              maxLength: { value: 6, message: 'Code must be exactly 6 digits' },
            })}
            type="text"
            maxLength={6}
            autoComplete="one-time-code"
            disabled={isLoading || isResending}
            placeholder="000000"
            className={`w-full py-2.5 bg-white font-mono text-2xl tracking-[0.4em] font-bold text-center text-zinc-900 rounded-xl border transition-all duration-200 outline-none placeholder:text-zinc-200 placeholder:font-sans placeholder:tracking-normal
              ${errors.otp 
                ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/5' 
                : 'border-zinc-200 focus:border-zinc-900 focus:ring-4 focus:ring-zinc-900/5'
              } disabled:opacity-60`}
          />
        </div>
        {errors.otp && (
          <p className="text-[11px] font-medium text-red-500 text-center mt-0.5">
            {errors.otp.message}
          </p>
        )}
      </div>

      {/* Submit Verification Action Control */}
      <button
        type="submit"
        disabled={isLoading || isResending}
        className="w-full justify-center bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl py-2.5 text-xs font-semibold flex items-center gap-2 shadow-sm transition-all duration-200 hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-1"
      >
        {isLoading ? (
          <>
            <Loader2 size={14} className="animate-spin" strokeWidth={2.5} />
            Verifying Token...
          </>
        ) : (
          'Verify Email'
        )}
      </button>

      {/* Dynamic Token Resend Dispatch Button */}
      <p className="text-center text-xs font-medium text-zinc-400 mt-1">
        Did not receive the code?{' '}
        <button
          type="button"
          onClick={handleResend}
          disabled={isLoading || isResending}
          className="text-zinc-900 font-semibold hover:underline bg-transparent border-none p-0 inline cursor-pointer disabled:opacity-40"
        >
          {isResending ? 'Sending...' : 'Resend code'}
        </button>
      </p>
    </form>
  );
};