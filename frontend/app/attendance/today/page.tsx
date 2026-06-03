'use client';

// Core imports
import { useEffect, useState, useCallback } from 'react';
import { AppSidebar } from '@/components/shared/AppSidebar';
import { apiClient } from '@/lib/api';
import { WorkRecord } from '@/types';
import { Clock, CheckCircle2, UserMinus, Timer } from 'lucide-react';
import { getErrorMessage } from '@/lib/get-error-message';
import { SyncButton } from '@/components/shared/SyncButton';
import { DataTable, Column } from '@/components/ui/DataTable';
import { io } from 'socket.io-client';

export default function TodayAttendancePage() {
  const [records, setRecords] = useState<WorkRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected date for filtering (default to today)
  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {
    if (!selectedDate) {
      setSelectedDate(new Date().toISOString().split('T')[0]);
    }
  }, [selectedDate]);

  const fetchToday = useCallback(async () => {
    try {
      const res = await apiClient.get(`/attendance/daily?date=${selectedDate}`);
      if (res.data.success) {
        setRecords(res.data.data);
      } else {
        setError('Failed to load attendance data');
      }
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load attendance for the selected date"));
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (!selectedDate) return;

    fetchToday();
    // Subscribe to real-time device status updates via socket.io.
    // Use websocket transport only to avoid HTTP long-polling traffic.
    const socket = io({ transports: ['websocket'] });
    socket.on('deviceStatus', (payload) => {
      if (payload?.date === selectedDate) {
        fetchToday();
      }
    });
    return () => {
      socket.disconnect();
    };
  }, [fetchToday, selectedDate]);

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
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Attendance</h1>
            <SyncButton onComplete={fetchToday} />
          </div>
          <p className="text-sm text-muted-foreground">
            Real-time attendance logs for <span className="text-foreground font-medium">{selectedDate}</span>
          </p>
          {/* Date filter */}
          <div className="mt-4 flex items-center gap-2">
            <label htmlFor="dateFilter" className="text-sm font-medium text-muted-foreground">Date:</label>
            <input
              type="date"
              id="dateFilter"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded border border-border/30 bg-card px-2 py-1 text-sm"
            />
          </div>
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
