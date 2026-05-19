'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { toast } from 'sonner';
import axios from 'axios';
import { AuthResponse } from '@/types/auth';
import { getErrorMessage } from '@/lib/get-error-message';
import { Eye, EyeOff } from 'lucide-react';

export const LoginForm: React.FC = () => {
  const router = useRouter();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!formData.email.trim()) e.email = 'Required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = 'Invalid email';
    if (!formData.password) e.password = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(p => ({ ...p, [name]: value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      setIsLoading(true);
      await login(formData.email, formData.password);
      toast.success('Access granted');
      router.push('/attendance');
    } catch (error: unknown) {
      const msg = getErrorMessage(error, 'Authentication failed');
      if (axios.isAxiosError<AuthResponse>(error) && error.response?.data?.code === 'EMAIL_NOT_VERIFIED') {
        const email = error.response.data.email || formData.email;
        toast.error(msg);
        router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`);
        return;
      }
      toast.error(msg);
      setErrors({ submit: msg });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <label style={{ display: 'block', marginBottom: 6 }} className="section-label">Email address</label>
        <input name="email" type="email" value={formData.email} onChange={handleChange}
          placeholder="operator@system.node" disabled={isLoading} className="input-base" />
        {errors.email && <p style={{ marginTop: 4, fontSize: 11, color: 'var(--red)', fontFamily: 'DM Mono' }}>{errors.email}</p>}
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: 6 }} className="section-label">Access credential</label>
        <div style={{ position: 'relative' }}>
          <input name="password" type={showPw ? 'text' : 'password'} value={formData.password} onChange={handleChange}
            placeholder="••••••••" disabled={isLoading} className="input-base" style={{ paddingRight: 44 }} />
          <button type="button" onClick={() => setShowPw(!showPw)}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: 0 }}>
            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        {errors.password && <p style={{ marginTop: 4, fontSize: 11, color: 'var(--red)', fontFamily: 'DM Mono' }}>{errors.password}</p>}
      </div>

      {errors.submit && (
        <div style={{ background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, padding: '10px 14px', fontSize: 12, color: 'var(--red)', fontFamily: 'DM Mono' }}>
          {errors.submit}
        </div>
      )}

      <button type="submit" disabled={isLoading} className="btn-primary" style={{ marginTop: 4 }}>
        {isLoading ? (
          <span className="spin" style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000', borderRadius: '50%' }} />
        ) : 'Access System'}
      </button>

      <div style={{ textAlign: 'center' }}>
        <a href="/auth/forgot-password" style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
          Forgot credentials?
        </a>
      </div>
    </form>
  );
};