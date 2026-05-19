'use client';

import { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { authService } from '@/services/auth-service';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/get-error-message';

export const AdminRegisterForm: React.FC = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (user?.role !== 'admin') {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
        <p className="font-medium">Access Denied</p>
        <p className="text-sm">Only administrators can register new users.</p>
      </div>
    );
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setIsLoading(true);
      await authService.register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });

      toast.success('User registered successfully!');
      setFormData({ username: '', email: '', password: '', confirmPassword: '' });
    } catch (error: unknown) {
      const errorMsg = getErrorMessage(error, 'Registration failed');
      toast.error(errorMsg);
      setErrors({ submit: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-white/5 border border-white/10 text-foreground/80 px-4 py-3 rounded-xl text-sm mb-6 shadow-lg backdrop-blur-md">
        <p className="font-black uppercase tracking-widest text-[10px]">Command: Create Operator</p>
        <p className="opacity-50 mt-1">Register a new access node for this interface.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-foreground/40 mb-2 ml-1">Operator Alias</label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="e.g. j.doe"
            className="w-full px-5 py-3.5 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-white/20 transition-all text-foreground"
            disabled={isLoading}
          />
          {errors.username && <p className="text-rose-500 text-[10px] font-bold uppercase mt-2 ml-1">{errors.username}</p>}
        </div>

        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-foreground/40 mb-2 ml-1">Identity Vector (Email)</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="operator@system.node"
            className="w-full px-5 py-3.5 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-white/20 transition-all text-foreground"
            disabled={isLoading}
          />
          {errors.email && <p className="text-rose-500 text-[10px] font-bold uppercase mt-2 ml-1">{errors.email}</p>}
        </div>

        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-foreground/40 mb-2 ml-1">Access Credential</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••"
            className="w-full px-5 py-3.5 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-white/20 transition-all text-foreground"
            disabled={isLoading}
          />
          {errors.password && <p className="text-rose-500 text-[10px] font-bold uppercase mt-2 ml-1">{errors.password}</p>}
        </div>

        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-foreground/40 mb-2 ml-1">Verify Credential</label>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="••••••••"
            className="w-full px-5 py-3.5 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-white/20 transition-all text-foreground"
            disabled={isLoading}
          />
          {errors.confirmPassword && <p className="text-rose-500 text-[10px] font-bold uppercase mt-2 ml-1">{errors.confirmPassword}</p>}
        </div>

        {errors.submit && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest">
            {errors.submit}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-muted border border-border text-foreground py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-4 shadow-sm"
        >
          {isLoading ? 'Processing...' : 'Register User'}
        </button>
      </form>
    </div>
  );
};
