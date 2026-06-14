'use client';

import { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { authService } from '@/services/auth-service';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/get-error-message';
import { UserPlus, Loader2, AlertCircle } from 'lucide-react';

// Shadcn Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
      <div className="flex items-center gap-3 border border-red-200 bg-red-50 p-4 rounded-xl text-xs font-bold text-red-600">
        <AlertCircle size={16} />
        Access Denied: Administrative Clearance Required
      </div>
    );
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.username.trim()) newErrors.username = 'Username is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email format';
    if (formData.password.length < 6) newErrors.password = 'Minimum 6 characters required';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
      onSuccess();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Registration failed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Register New User</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Create a new account and assign system roles.</p>
      </div>

      <div className="grid gap-4">
        {[
          { label: 'Username', name: 'username', type: 'text', placeholder: 'e.g. johndoe' },
          { label: 'Email Address', name: 'email', type: 'email', placeholder: 'name@company.com' },
          { label: 'Password', name: 'password', type: 'password', placeholder: '••••••••' },
          { label: 'Confirm Password', name: 'confirmPassword', type: 'password', placeholder: '••••••••' },
        ].map((field) => (
          <div key={field.name} className="space-y-1.5">
            <Label htmlFor={field.name} className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              {field.label}
            </Label>
            <Input
              id={field.name}
              name={field.name}
              type={field.type}
              placeholder={field.placeholder}
              value={(formData as any)[field.name]}
              onChange={(e) => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
              disabled={isLoading}
              className={errors[field.name] ? 'border-red-500 focus-visible:ring-red-500' : ''}
            />
            {errors[field.name] && (
              <p className="text-[11px] font-medium text-red-500">{errors[field.name]}</p>
            )}
          </div>
        ))}
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Committing...</>
        ) : (
          <><UserPlus className="mr-2 h-4 w-4" /> Commit Registration</>
        )}
      </Button>
    </form>
  );
};