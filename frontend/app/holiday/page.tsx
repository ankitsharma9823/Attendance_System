'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { holidayService, Holiday } from '@/services/holiday-service';
import { AppSidebar } from '@/components/shared/AppSidebar';

export default function HolidayPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadRequests(); }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const data = await holidayService.getMine();
      setRequests(data);
    } catch {
      setError("Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) return;
    try {
      setSubmitting(true);
      setError(null);
      await holidayService.create({ startDate, endDate, reason });
      setStartDate('');
      setEndDate('');
      setReason('');
      await loadRequests();
    } catch (err: any) {
      setError(err?.response?.data?.msg ?? "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const statusColors: Record<string, string> = {
    PENDING: 'bg-amber-50 text-amber-700',
    APPROVED: 'bg-green-50 text-green-700',
    REJECTED: 'bg-red-50 text-red-700',
  };

  if (!user) return <div>Please log in.</div>;

  return (
    <AppSidebar>
      <main className="max-w-4xl mx-auto px-6 py-8">

        <div className="mb-6">
          <h1 className="text-xl font-medium">Leave requests</h1>
          <p className="text-sm text-gray-500 mt-1">Submit time-off requests and track their status</p>
        </div>

        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">New request</p>
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Start date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  required
                  className="w-full border border-gray-200 rounded-lg p-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">End date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  required
                  className="w-full border border-gray-200 rounded-lg p-2 text-sm"
                />
              </div>
            </div>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              placeholder="Reason (optional)"
              className="w-full border border-gray-200 rounded-lg p-2 text-sm resize-none"
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Submitting…' : 'Submit request'}
            </button>
          </form>
        </div>

        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
          Your requests
          <span className="ml-2 normal-case bg-gray-100 text-gray-500 rounded-full px-2 py-0.5 text-xs">
            {requests.length}
          </span>
        </p>

        {loading && <p className="text-sm text-gray-400">Loading…</p>}
        {!loading && requests.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-12">No requests yet.</p>
        )}

        <div className="space-y-3">
          {requests.map(r => (
            <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-sm font-medium">
                    {fmt(r.startDate)}{r.startDate !== r.endDate ? ` – ${fmt(r.endDate)}` : ''}
                  </p>
                  {r.reason && <p className="text-xs text-gray-500 mt-1">{r.reason}</p>}
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${statusColors[r.status]}`}>
                  {r.status.charAt(0) + r.status.slice(1).toLowerCase()}
                </span>
              </div>
              {r.adminNote ? (
                <div className="mt-2 pl-3 border-l-2 border-gray-200">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Admin note</p>
                  <p className="text-xs text-gray-500">{r.adminNote}</p>
                </div>
              ) : (
                <p className="text-xs text-gray-400 mt-2">Awaiting response</p>
              )}
            </div>
          ))}
        </div>

      </main>
    </AppSidebar>
  );
}