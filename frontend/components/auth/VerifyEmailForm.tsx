'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authService } from '@/services/auth-service';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/get-error-message';

export const VerifyEmailForm: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';

  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!otp.trim()) {
      setError('Verification code is required');
      return;
    }

    try {
      setIsLoading(true);
      await authService.verifyEmail({
        email,
        otp: otp.trim(),
      });

      toast.success('Email verified successfully! You can now login.');
      router.push('/auth/login');
    } catch (error: unknown) {
      const errorMsg = getErrorMessage(error, 'Verification failed');
      toast.error(errorMsg);
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      const errorMsg = 'Email is missing. Please register or login again.';
      toast.error(errorMsg);
      setError(errorMsg);
      return;
    }

    try {
      setIsResending(true);
      const response = await authService.resendVerification(email);
      toast.success(response.msg || 'Verification code resent');
      setError('');
    } catch (error: unknown) {
      const errorMsg = getErrorMessage(error, 'Failed to resend verification code');
      toast.error(errorMsg);
      setError(errorMsg);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-3 py-2 rounded-md text-sm">
          <p>Verification code sent to: <strong>{email}</strong></p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Verification Code</label>
          <input
            type="text"
            value={otp}
            onChange={(e) => {
              setOtp(e.target.value);
              if (error) setError('');
            }}
            placeholder="Enter 6-digit code"
            maxLength={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest"
            disabled={isLoading}
          />
          {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-2 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Verifying...' : 'Verify Email'}
        </button>

        <p className="text-center text-sm text-gray-600">
          Did not receive the code?{' '}
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending}
            className="text-blue-600 hover:underline"
          >
            {isResending ? 'Sending...' : 'Resend code'}
          </button>
        </p>
      </form>
    </div>
  );
};
