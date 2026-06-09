'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { holidayService, Holiday } from '@/services/holiday-service';
import { RequestStatus } from '@/types/index';
import { AppSidebar } from '@/components/shared/AppSidebar';

export default function AdminHolidayPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Holiday | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadRequests(); }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const data = await holidayService.getAll();
      setRequests(data);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (r: Holiday) => {
    setSelected(r);
    setAdminNote(r.adminNote ?? '');
  };

  const handleUpdateStatus = async (status: RequestStatus) => {
    if (!selected) return;
    try {
      setSubmitting(true);
      const updated = await holidayService.updateStatus(selected.id, status, adminNote);
      setSelected(updated);
      setRequests(prev => prev.map(r => r.id === updated.id ? updated : r));
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

  if (!user || user.role !== 'admin') return <div>Access denied.</div>;

  return (
    <AppSidebar>
      <main className="max-w-6xl mx-auto px-6 py-8">

        <div className="mb-6">
          <h1 className="text-xl font-medium">Leave inbox</h1>
          <p className="text-sm text-gray-500 mt-1">Review and respond to employee leave requests</p>
        </div>

        <div className="grid grid-cols-[280px_1fr] gap-4 h-[580px]">

          {/* List panel */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Requests</span>
              <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">{requests.length}</span>
            </div>
            <div className="overflow-y-auto flex-1">
              {loading && <p className="p-4 text-sm text-gray-400">Loading…</p>}
              {!loading && requests.length === 0 && (
                <p className="p-4 text-sm text-gray-400">No requests yet.</p>
              )}
              {requests.map(r => (
                <button
                  key={r.id}
                  onClick={() => handleSelect(r)}
                  className={`w-full px-4 py-3 border-b border-gray-100 text-left hover:bg-gray-50 transition-colors ${selected?.id === r.id ? 'bg-gray-50' : ''}`}
                >
                  <p className="text-sm font-medium">{r.employee?.name ?? r.employeeId}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {fmt(r.startDate)}{r.startDate !== r.endDate ? ` – ${fmt(r.endDate)}` : ''}
                  </p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-1.5 inline-block ${statusColors[r.status]}`}>
                    {r.status.charAt(0) + r.status.slice(1).toLowerCase()}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Detail panel */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-gray-100">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Request detail</span>
            </div>
            <div className="p-5 overflow-y-auto flex-1">
              {!selected ? (
                <p className="text-sm text-gray-400 italic mt-2">Select a request to review</p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-lg font-medium">{selected.employee?.name ?? selected.employeeId}</p>
                    {selected.employee?.department && (
                      <p className="text-sm text-gray-500">{selected.employee.department}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ['Start date', fmt(selected.startDate)],
                      ['End date', fmt(selected.endDate)],
                    ].map(([label, val]) => (
                      <div key={label} className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</p>
                        <p className="text-sm font-medium">{val}</p>
                      </div>
                    ))}
                  </div>

                  {selected.reason && (
                    <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Reason</p>
                      {selected.reason}
                    </div>
                  )}

                  <hr className="border-gray-100" />

                  <div>
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 block">
                      Admin note
                    </label>
                    <textarea
                      value={adminNote}
                      onChange={e => setAdminNote(e.target.value)}
                      rows={3}
                      placeholder="Add a note for the employee (optional)…"
                      className="w-full border border-gray-200 rounded-lg p-2 text-sm resize-none mb-3"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => handleUpdateStatus('APPROVED')}
                        disabled={submitting}
                        className="py-2 text-sm font-medium border border-green-200 text-green-700 rounded-lg hover:bg-green-50 disabled:opacity-50 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleUpdateStatus('REJECTED')}
                        disabled={submitting}
                        className="py-2 text-sm font-medium border border-red-200 text-red-700 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleUpdateStatus('PENDING')}
                        disabled={submitting}
                        className="py-2 text-sm font-medium border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                      >
                        Pending
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </AppSidebar>
  );
}