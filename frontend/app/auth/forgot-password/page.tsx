import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Forgot Password?</h1>
          <p className="text-gray-600 mt-2">We'll help you reset your password</p>
        </div>
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
