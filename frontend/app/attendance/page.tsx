'use client';
import { useCallback, useEffect, useState } from 'react';
import { attendanceService } from '@/services/attendance-service';
import { SyncButton } from '../../components/shared/SyncButton';
import { WorkRecord } from '@/types';
import { AppSidebar } from '@/components/shared/AppSidebar';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { getErrorMessage } from '@/lib/get-error-message';
import { DataTable, Column } from '@/components/ui/DataTable';

const getLocalDate = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
};

const fmtOT = (m: number) => {
  if (!m) return '—';
  const h = Math.floor(m / 60), r = m % 60;
  return h ? (r ? `${h}h ${r}m` : `${h}h`) : `${r}m`;
};

const isValidDateString = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

// Updated status badges using the modern zinc/clean system styles instead of arbitrary custom CSS classes
const statusChip = (status: string) => {
  const styles: Record<string, string> = {
    PRESENT: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400', 
    LATE: 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400',
    ABSENT: 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400', 
    HALF_DAY: 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400',
  };
  return (
    <span className={`px-2 py-1 rounded-md text-[11px] font-bold tracking-wide uppercase font-outfit ${styles[status] || 'bg-zinc-100 text-zinc-600'}`}>
      {status.replace('_', ' ')}
    </span>
  );
};

export default function AttendanceDashboard() {
  const [records, setRecords] = useState<WorkRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    if (!selectedDate) {
      setSelectedDate(getLocalDate());
    }
  }, [selectedDate]);

  const getFilters = useCallback(() => {
    const date = selectedDate && isValidDateString(selectedDate) ? selectedDate : undefined;
    return {
      year: date ? new Date(`${date}T00:00:00`).getFullYear() : new Date().getFullYear(),
      date,
    };
  }, [selectedDate]);

  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    try { setRecords(await attendanceService.getAttendance(getFilters())); }
    catch { setRecords([]); setError('Unable to load records.'); }
    finally { setLoading(false); }
  }, [getFilters]);

  useEffect(() => {
    let ignore = false;
    if (!selectedDate) {
      return () => { ignore = true; };
    }

    if (!isValidDateString(selectedDate)) {
      setLoading(false);
      setError('Please select a valid date before filtering attendance.');
      return () => { ignore = true; };
    }

    (async () => {
      setLoading(true); setError(null);
      try {
        const data = await attendanceService.getAttendance(getFilters());
        if (!ignore) setRecords(data);
      } catch {
        if (!ignore) { setRecords([]); setError('Unable to load records.'); }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [getFilters, selectedDate]);

  const fmtTime = (t: string | null) =>
    t ? new Date(t).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—';

  const handleDelete = async (record: WorkRecord) => {
    if (!window.confirm(`Delete record for ${record.employee?.name || record.employeeId}?`)) return;
    try {
      setDeletingId(record.id);
      await attendanceService.deleteRecord(record.id);
      toast.success('Record deleted');
      setRecords(r => r.filter(x => x.id !== record.id));
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Delete failed'));
    } finally { setDeletingId(null); }
  };

  const columns: Column<WorkRecord>[] = [
    {
      header: 'Employee',
      accessor: r => (
        <div>
          <p className="font-semibold text-[13px] text-zinc-800 dark:text-zinc-200">{r.employee?.name || `ID: ${r.employeeId}`}</p>
          <p className="font-mono text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">
            {r.employee?.department || 'Staff'} · {r.employeeId}
          </p>
        </div>
      ),
    },
    { header: 'Check In', accessor: r => <span className="font-mono">{fmtTime(r.checkIn)}</span> },
    {
      header: 'Break',
      accessor: r => (
        <div className="font-mono text-[11px] text-zinc-400 dark:text-zinc-500 space-y-0.5">
          <div>Out: {fmtTime(r.breakOut)}</div>
          <div>In: {fmtTime(r.breakIn)}</div>
        </div>
      ),
    },
    { header: 'Check Out', accessor: r => <span className="font-mono">{fmtTime(r.checkOut)}</span> },
    {
      header: 'OT',
      accessor: r => r.overtime > 0
        ? <span className="text-zinc-900 dark:text-zinc-50 font-mono text-xs font-bold">+{fmtOT(r.overtime)}</span>
        : <span className="text-zinc-300 dark:text-zinc-700 font-mono">—</span>,
    },
    { 
      header: 'Status', 
      accessor: r => (
        <div className="flex flex-col items-start gap-1">
          {statusChip(r.status)}
          {r.isHalfDay && (
            <span className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 text-[10px] font-bold uppercase tracking-wide font-outfit">
              ½ Day
            </span>
          )}
        </div>
      ) 
    },
    {
      header: '', align: 'right',
      accessor: r => (
        <button 
          onClick={() => void handleDelete(r)} 
          disabled={deletingId === r.id} 
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-zinc-400 hover:text-rose-600 hover:bg-rose-50/50 disabled:opacity-40 transition-all text-xs font-semibold font-outfit active:scale-95"
        >
          <Trash2 size={13} />
          {deletingId === r.id ? 'Deleting…' : 'Delete'}
        </button>
      ),
    },
  ];

  const filteredRecords = statusFilter ? records.filter(r => r.status === statusFilter) : records;
  const presentCount = records.length;
  const issueCount = records.filter(r => r.status !== 'PRESENT').length;
  const totalOT = records.reduce((t, r) => t + (r.overtime || 0), 0);

  return (
    <AppSidebar>
      <main className="max-w-300 mx-auto px-4 py-8 md:px-8 font-outfit">
        
        {/* Modern Header block */}
        <header className="mb-8">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1">Attendance</p>
          <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">Ledger</h1>
          <p className="mt-1 text-[13px] text-zinc-500 dark:text-zinc-400">Historical attendance logs with filter controls.</p>
        </header>

        {/* Floating borderless stats cards container row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Scans Detected', val: presentCount },
            { label: 'Exceptions', val: issueCount },
            { label: 'Total Overtime', val: fmtOT(totalOT) },
          ].map(s => (
            <div key={s.label} className="bg-zinc-50 dark:bg-zinc-900 rounded-2xl p-5 shadow-xs flex flex-col justify-between min-h-22.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">{s.label}</p>
              <p className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight font-mono mt-2">{s.val}</p>
            </div>
          ))}
        </div>

        {/* Clean, borderless layout input controllers bar */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 items-stretch sm:items-center mb-6">
          <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-white dark:bg-zinc-950 px-4 py-2 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 shadow-xs border-none outline-none focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-800 transition-all appearance-none cursor-pointer min-w-32.5"
          >
            <option value="">All statuses</option>
            <option value="PRESENT">Present</option>
            <option value="LATE">Late</option>
            <option value="HALF_DAY">Half-Day</option>
            <option value="ABSENT">Absent</option>
          </select>
          
          <input 
            type="date" 
            value={selectedDate} 
            onChange={e => {
              setSelectedDate(e.target.value);
              setError(null);
            }}
            className="bg-white dark:bg-zinc-950 px-4 py-2 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 shadow-xs border-none outline-none focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-800 transition-all cursor-pointer" 
          />
          
          {selectedDate && (
            <button 
              onClick={() => setSelectedDate('')} 
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all active:scale-95"
            >
              Clear date
            </button>
          )}

          <div className="sm:ml-auto">
            <SyncButton onComplete={loadData} />
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 text-rose-600 rounded-xl p-4 mb-6 text-xs font-semibold tracking-wide font-mono shadow-xs">
            {error}
          </div>
        )}

        {/* Modern Datatable view component mapping */}
        <DataTable 
          columns={columns} 
          data={filteredRecords} 
          loading={loading} 
          rowId={r => r.id}
          emptyMessage={error || 'No records matching current filters.'} 
        />
      </main>
    </AppSidebar>
  );
}