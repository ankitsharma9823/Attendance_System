'use client';

import { useEffect, useState, useCallback } from 'react';
import { AppSidebar } from '@/components/shared/AppSidebar';
import { apiClient } from '@/lib/api';
import { WorkRecord } from '@/types';
import { 
  Clock, 
  CheckCircle2, 
  UserMinus, 
  Timer
} from 'lucide-react';
import { getErrorMessage } from '@/lib/get-error-message';
import { SyncButton } from '@/components/shared/SyncButton';
import { DataTable, Column } from '@/components/ui/DataTable';

export default function TodayAttendancePage() {
  const [records, setRecords] = useState<WorkRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const fetchToday = useCallback(async () => {
    try {
      const res = await apiClient.get(`/attendance/daily?date=${todayStr}`);
      if (res.data.success) {
        setRecords(res.data.data);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load today\'s attendance'));
    } finally {
      setLoading(false);
    }
  }, [todayStr]);

  useEffect(() => {
    fetchToday();
    const interval = setInterval(fetchToday, 60000); // Auto refresh every minute
    return () => clearInterval(interval);
  }, [fetchToday]);

  const stats = {
    present: records.filter(r => r.status === 'PRESENT').length,
    late: records.filter(r => r.status === 'LATE').length,
    halfDay: records.filter(r => r.status === 'HALF_DAY').length,
    absent: records.filter(r => r.status === 'ABSENT').length,
  };

  const formatTime = (time: string | null) => {
    if (!time) return '--:--';
    return new Date(time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const columns: Column<WorkRecord>[] = [
    {
      header: 'Employee',
      accessor: (r) => (
        <div>
          <p className="font-bold">{r.employee?.name || 'Unknown'}</p>
          <p className="text-[10px] uppercase tracking-tighter opacity-50">{r.employee?.department || 'Staff'} · {r.employeeId}</p>
        </div>
      ),
    },
    {
      header: 'Check-In',
      accessor: (r) => formatTime(r.checkIn),
      mono: true,
    },
    {
      header: 'Check-Out',
      accessor: (r) => formatTime(r.checkOut),
      mono: true,
    },
    {
      header: 'Status',
      accessor: (r) => (
        <span className={`inline-flex border px-2 py-0.5 text-[10px] font-black uppercase tracking-widest font-mono
          ${r.status === 'PRESENT' ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black' : 
            r.status === 'LATE' ? 'border-black text-black' :
            r.status === 'HALF_DAY' ? 'border-black text-black opacity-60' :
            'border-black text-rose-600'}`}>
          [{r.status}]
        </span>
      ),
    },
  ];

  return (
    <AppSidebar>
      <main className="mx-auto max-w-7xl px-6 py-12 lg:px-12">
        <header className="mb-14">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Today's Feed</h1>
            <SyncButton onComplete={fetchToday} />
          </div>
          <p className="text-sm text-muted-foreground">
            Real-time attendance logs for <span className="text-foreground font-medium">{todayStr}</span>
          </p>
        </header>

        <section className="mb-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Present', value: stats.present, icon: CheckCircle2, color: 'text-foreground' },
            { label: 'Late', value: stats.late, icon: Timer, color: 'text-muted-foreground' },
            { label: 'Half-Day', value: stats.halfDay, icon: Clock, color: 'text-muted-foreground/60' },
            { label: 'Absent', value: stats.absent, icon: UserMinus, color: 'text-destructive' },
          ].map((s) => (
            <div key={s.label} className="group p-6 bg-card rounded-xl border border-border/50 hover:border-border transition-all shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
                <s.icon size={16} className={`${s.color} opacity-80`} />
              </div>
              <p className="text-3xl font-bold tracking-tight text-foreground">
                {loading ? '--' : s.value.toString().padStart(2, '0')}
              </p>
            </div>
          ))}
        </section>

        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Activity Stream</h2>
        </div>

        <DataTable 
          columns={columns} 
          data={records} 
          loading={loading} 
          rowId={(r) => r.id}
          emptyMessage="No activity logs detected for today."
        />
      </main>
    </AppSidebar>
  );
}
