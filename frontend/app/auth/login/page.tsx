import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full">
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-3">Welcome Back</h1>
          <p className="text-sm text-muted-foreground italic uppercase tracking-widest">System Access Terminal</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
