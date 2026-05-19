import { VerifyEmailForm } from '@/components/auth/VerifyEmailForm';

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Verify Email</h1>
          <p className="text-gray-600 mt-2">Enter the verification code sent to your email</p>
        </div>
        <VerifyEmailForm />
      </div>
    </div>
  );
}
