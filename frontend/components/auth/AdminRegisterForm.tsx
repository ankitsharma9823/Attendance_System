'use client';

import { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { authService } from '@/services/auth-service';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/get-error-message';
import { UserPlus, Loader2 } from 'lucide-react';

interface AdminRegisterFormProps {
  onSuccess: () => void;
}

export const AdminRegisterForm: React.FC<AdminRegisterFormProps> = ({ onSuccess }) => {
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
      <div className="border border-red-200 bg-red-50 p-4 rounded-xl text-xs font-bold text-red-600">
        Access Denied: Administrative Clearance Required
      </div>
    );
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.username.trim()) newErrors.username = 'Username is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email format';
    if (formData.password.length < 6) newErrors.password = 'Min 6 characters';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setIsLoading(true);
      await authService.register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });
      toast.success('User registered successfully');
      setFormData({ username: '', email: '', password: '', confirmPassword: '' });
      onSuccess();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Registration failed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      
      {/* Header Block matching ForgotPassword theme */}
      <div className="bg-zinc-100/80 border border-zinc-200/50 rounded-xl p-3 text-[12px] font-bold uppercase tracking-widest text-zinc-600">
        Register New User
      </div>

      {[
        { label: 'UserName', name: 'username', type: 'text' },
        { label: 'Email', name: 'email', type: 'email' },
        { label: 'Access Credential', name: 'password', type: 'password' },
        { label: 'Verify Credential', name: 'confirmPassword', type: 'password' },
      ].map((field) => (
        <div key={field.name} className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-1">
            {field.label}
          </label>
          <input
            type={field.type}
            name={field.name}
            value={(formData as any)[field.name]}
            onChange={handleChange}
            disabled={isLoading}
            className={`w-full px-4 py-2.5 bg-white text-[13px] font-medium text-zinc-900 rounded-xl border transition-all duration-200 outline-none
              ${errors[field.name] 
                ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/5' 
                : 'border-zinc-200 focus:border-zinc-900 focus:ring-4 focus:ring-zinc-900/5'
              } disabled:opacity-60`}
          />
          {errors[field.name] && (
            <p className="text-[11px] font-medium text-red-500 px-1">
              {errors[field.name]}
            </p>
          )}
        </div>
      ))}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full justify-center bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl py-2.5 text-xs font-semibold flex items-center gap-2 shadow-sm transition-all duration-200 active:scale-[0.98] disabled:opacity-50 mt-2"
      >
        {isLoading ? (
          <><Loader2 size={14} className="animate-spin" /> Processing...</>
        ) : (
          <><UserPlus size={14} /> Commit Registration</>
        )}
      </button>
    </form>
  );
};