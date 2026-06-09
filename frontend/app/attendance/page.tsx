// 'use client';

// import { useEffect, useState, useCallback, useMemo } from 'react';
// import { AppSidebar } from '@/components/shared/AppSidebar';
// import { attendanceService } from '@/services/attendance-service';
// import { WorkRecord } from '@/types';
// import { toast } from 'sonner';
// import { Trash2 } from 'lucide-react';
// import { SyncButton } from '../../components/shared/SyncButton';
// import { DataTable, Column } from '@/components/ui/DataTable';
// import { getErrorMessage } from '@/lib/get-error-message';

// const fmtTime = (t: string | null) => 
//   t ? new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kathmandu', hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(t)) : '—';

// const fmtOT = (m: number) => {
//   const h = Math.floor(m / 60), r = m % 60;
//   return h || r ? `${h > 0 ? h + 'h ' : ''}${r > 0 ? r + 'm' : ''}` : '—';
// };

// const statusChip = (status: string) => {
//   const styles: Record<string, string> = {
//     PRESENT: 'bg-emerald-50 text-emerald-700',
//     LATE: 'bg-amber-50 text-amber-700',
//     ABSENT: 'bg-rose-50 text-rose-700',
//     HALF_DAY: 'bg-blue-50 text-blue-700',
//   };
//   return <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${styles[status] || 'bg-zinc-100'}`}>{status.replace('_', ' ')}</span>;
// };

// export default function AttendanceLedger() {
//   const [records, setRecords] = useState<WorkRecord[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
//   const loadData = useCallback(async () => {
//     setLoading(true);
//     try { setRecords(await attendanceService.getAttendance({ date: selectedDate })); }
//     catch (err) { toast.error(getErrorMessage(err, "Failed to load")); }
//     finally { setLoading(false); }
//   }, [selectedDate]);

//   useEffect(() => { loadData(); }, [loadData]);

//   const stats = useMemo(() => ({
//     present: records.filter(r => r.status === 'PRESENT' || r.status === 'LATE').length,
//     absent: records.filter(r => r.status === 'ABSENT').length,
//     ot: records.reduce((t, r) => t + (r.overtime || 0), 0)
//   }), [records]);

//   const columns: Column<WorkRecord>[] = [
//     { header: 'Employee', accessor: r => <div className="font-semibold">{r.employee?.name || r.employeeId}</div> },
//     { header: 'Check In/Out', accessor: r => <div className="font-mono text-xs">{fmtTime(r.checkIn)} - {fmtTime(r.checkOut)}</div> },
//     { header: 'Break (Out/In)', accessor: r => <div className="font-mono text-xs text-zinc-500">{fmtTime(r.breakOut)} - {fmtTime(r.breakIn)}</div> },
//     { header: 'Overtime', accessor: r => <span className="font-mono text-xs font-bold">{fmtOT(r.overtime)}</span> },
//     { header: 'Status', accessor: r => statusChip(r.status) },
//     { header: '', align: 'right', accessor: r => (
//       <button onClick={async () => {
//         if (!confirm('Delete record?')) return;
//         await attendanceService.deleteRecord(r.id);
//         setRecords(p => p.filter(x => x.id !== r.id));
//       }} className="text-zinc-400 hover:text-rose-500 p-2"><Trash2 size={14} /></button>
//     )}
//   ];

//   return (
//     <AppSidebar>
//       <main className="max-w-6xl mx-auto px-6 py-8 font-outfit text-zinc-900">
//         {/* Header Block */}
//         <header className="mb-8">
//           <h1 className="text-2xl font-extrabold tracking-tight">Attendance Ledger</h1>
//           <p className="text-sm text-zinc-500">Daily attendance overview and performance metrics.</p>
//         </header>

//         {/* Professional Stats Row */}
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
//           {[
//             { label: 'Total Present', val: stats.present, color: 'text-emerald-600' },
//             { label: 'Total Absent', val: stats.absent, color: 'text-rose-600' },
//             { label: 'Total Overtime', val: fmtOT(stats.ot), color: 'text-zinc-900' },
//           ].map(s => (
//             <div key={s.label} className="bg-white border border-zinc-200 p-5 rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.07)]">
//               <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400">{s.label}</p>
//               <p className={`text-3xl font-extrabold mt-1 ${s.color} font-mono`}>{loading ? '...' : s.val}</p>
//             </div>
//           ))}
//         </div>

//         {/* Filter Bar */}
//         <div className="flex items-center justify-between mb-6">
//           <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-500">Logs</h2>
//           <div className="flex items-center gap-2">
//             <input 
//               type="date" 
//               max={new Date().toISOString().split('T')[0]} 
//               value={selectedDate} 
//               onChange={e => setSelectedDate(e.target.value)} 
//               className="px-4 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-zinc-700 outline-none focus:ring-2 focus:ring-zinc-100" 
//             />
//             <SyncButton onComplete={loadData} />
//           </div>
//         </div>

//         {/* Ledger Container */}
//         <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
//           <DataTable 
//             columns={columns} 
//             data={records} 
//             loading={loading} 
//             rowId={r => r.id} 
//           />
//         </div>
//       </main>
//     </AppSidebar>
//   );
// }
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { AppSidebar } from '@/components/shared/AppSidebar';
import { attendanceService } from '@/services/attendance-service';
import { WorkRecord, AttendanceStatus } from '@/types'; // 👈 Explicit type import
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { SyncButton } from '../../components/shared/SyncButton';
import { DataTable, Column } from '@/components/ui/DataTable';
import { getErrorMessage } from '@/lib/get-error-message';

// Explicitly type the options block to match the union signature
const STATUS_OPTIONS: AttendanceStatus[] = ['PRESENT', 'LATE', 'ABSENT', 'HALF_DAY', 'EARLY_LEAVE'];

const fmtTime = (t: string | null) => 
  t ? new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kathmandu', hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(t)) : '—';

const fmtOT = (m: number | null | undefined) => {
  if (!m || isNaN(m) || m <= 0) return '—';
  const h = Math.floor(m / 60), r = m % 60;
  return h || r ? `${h > 0 ? h + 'h ' : ''}${r > 0 ? r + 'm' : ''}` : '—';
};

export default function AttendanceLedger() {
  const [records, setRecords] = useState<WorkRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  const loadData = useCallback(async () => {
    setLoading(true);
    try { 
      const data = await attendanceService.getAttendance({ date: selectedDate });
      setRecords(data); 
    }
    catch (err) { toast.error(getErrorMessage(err, "Failed to load")); }
    finally { setLoading(false); }
  }, [selectedDate]);

  useEffect(() => { loadData(); }, [loadData]);

  // Handle live inline status change overrides
  const handleStatusChange = async (recordId: number, nextStatus: AttendanceStatus) => {
    try {
      // Optimistic state update with strict type protection matching
      setRecords(prev => prev.map(rec => rec.id === recordId ? { ...rec, status: nextStatus } : rec));
      
      const response = await attendanceService.updateStatus(recordId, nextStatus);
      if (response.success) {
        toast.success('Status updated successfully');
      } else {
        throw new Error(response.message || 'Operation rejected');
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to alter status"));
      loadData(); // Revert back to server reality on error case
    }
  };

  const stats = useMemo(() => ({
    present: records.filter(r => r.status === 'PRESENT' || r.status === 'LATE').length,
    absent: records.filter(r => r.status === 'ABSENT').length,
    ot: records.reduce((t, r) => t + (Number(r.overtime) || 0), 0)
  }), [records]);

  const columns: Column<WorkRecord>[] = [
    { header: 'Employee', accessor: r => <div className="font-semibold">{r.employee?.name || r.employeeId}</div> },
    { header: 'Check In/Out', accessor: r => <div className="font-mono text-xs">{fmtTime(r.checkIn)} - {fmtTime(r.checkOut)}</div> },
    { header: 'Break (Out/In)', accessor: r => <div className="font-mono text-xs text-zinc-500">{fmtTime(r.breakOut)} - {fmtTime(r.breakIn)}</div> },
    { header: 'Overtime Hours', accessor: r => <span className="font-mono text-xs font-bold text-zinc-700 dark:text-zinc-300">{fmtOT(r.overtime)}</span> },
    { 
      header: 'Status (Click to Change)', 
      accessor: r => {
        const styles: Record<string, string> = {
          PRESENT: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
          LATE: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
          ABSENT: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400',
          HALF_DAY: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
          EARLY_LEAVE: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400',
        };

        return (
          <select
            value={r.status}
            // Explicitly assert the target string value to your custom AttendanceStatus type
            onChange={(e) => handleStatusChange(r.id, e.target.value as AttendanceStatus)}
            className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider outline-none border-none cursor-pointer appearance-none text-center transition-all focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-800 ${styles[r.status] || 'bg-zinc-100 text-zinc-700'}`}
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt} value={opt} className="bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 text-xs font-semibold">
                {opt.replace('_', ' ')}
              </option>
            ))}
          </select>
        );
      }
    },
    { header: '', align: 'right', accessor: r => (
      <button onClick={async () => {
        if (!confirm('Delete record?')) return;
        await attendanceService.deleteRecord(r.id);
        setRecords(p => p.filter(x => x.id !== r.id));
      }} className="text-zinc-400 hover:text-rose-500 p-2"><Trash2 size={14} /></button>
    )}
  ];

  return (
    <AppSidebar>
      <main className="max-w-6xl mx-auto px-6 py-8 font-outfit text-zinc-900 dark:text-zinc-50">
        
        {/* Header Block */}
        <header className="mb-8">
          <h1 className="text-2xl font-extrabold tracking-tight">Attendance Ledger</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Daily attendance overview and manual override management.</p>
        </header>

        {/* Stats Summary Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Present', val: stats.present, color: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Total Absent', val: stats.absent, color: 'text-rose-600 dark:text-rose-400' },
            { label: 'Total Overtime Accumulated', val: fmtOT(stats.ot), color: 'text-zinc-900 dark:text-zinc-100' },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 p-5 rounded-2xl shadow-xs">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400 dark:text-zinc-500">{s.label}</p>
              <p className={`text-3xl font-extrabold mt-1 ${s.color} font-mono`}>{loading ? '...' : s.val}</p>
            </div>
          ))}
        </div>

        {/* Filter Toolbar */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Logs Matrix</h2>
          <div className="flex items-center gap-2">
            <input 
              type="date" 
              max={new Date().toISOString().split('T')[0]} 
              value={selectedDate} 
              onChange={e => setSelectedDate(e.target.value)} 
              className="px-4 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-300 outline-none focus:ring-2 focus:ring-zinc-100 dark:focus:ring-zinc-800" 
            />
            <SyncButton onComplete={loadData} />
          </div>
        </div>

        {/* Ledger Table Container */}
        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-2xl overflow-hidden shadow-xs">
          <DataTable 
            columns={columns} 
            data={records} 
            loading={loading} 
            rowId={r => r.id} 
          />
        </div>
      </main>
    </AppSidebar>
  );
}