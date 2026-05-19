'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/auth-service';
import { toast } from 'sonner';

export const ForgotPasswordForm: React.FC = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setIsLoading(true);
      await authService.forgotPassword({ email });

      toast.success('Password reset link sent to your email!');
      setSubmitted(true);
    } catch (error: any) {
      const errorMsg = error.response?.data?.msg || 'Failed to send reset email';
      toast.error(errorMsg);
      setErrors({ submit: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="w-full max-w-md space-y-4">
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
          <p className="font-medium">Check your email</p>
          <p className="text-sm mt-1">We've sent a password reset link to {email}</p>
        </div>

        <button
          onClick={() => router.push('/auth/login')}
          className="w-full bg-blue-600 text-white py-2 rounded-md font-medium hover:bg-blue-700"
        >
          Back to Login
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-3 py-2 rounded-md text-sm">
          <p>Enter your email address and we'll send you a link to reset your password.</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
            }}
            placeholder="Enter your email"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
        </div>

        {errors.submit && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm">{errors.submit}</div>}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-2 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Sending...' : 'Send Reset Link'}
        </button>

        <p className="text-center text-sm">
          <a href="/auth/login" className="text-blue-600 hover:underline">
            Back to Login
          </a>
        </p>
      </form>
    </div>
  );
};
