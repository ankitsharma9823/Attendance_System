'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { AppSidebar } from '@/components/shared/AppSidebar';
import { AdminRegisterForm } from '@/components/auth/AdminRegisterForm';
import { SyncButton } from '@/components/shared/SyncButton';
import { attendanceService } from '@/services/attendance-service';
import { WorkRecord, YearlyAttendanceStat } from '@/types';
import { Activity, Users, Clock, UserCheck } from 'lucide-react';
import { getErrorMessage } from '@/lib/get-error-message';

const fmtOT = (m: number) => {
  if (!m) return '0m';
  const h = Math.floor(m / 60), r = m % 60;
  return h ? (r ? `${h}h ${r}m` : `${h}h`) : `${r}m`;
};

export default function Home() {
  const { user } = useAuth();
  const [records, setRecords] = useState<WorkRecord[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<YearlyAttendanceStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentYear = new Date().getFullYear(); // EXACTLY AS IT WAS

  const loadDashboard = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [att, stats] = await Promise.all([
        attendanceService.getAttendance({ year: currentYear }),
        attendanceService.getYearlyStats(currentYear),
      ]);
      setRecords(att); setMonthlyStats(stats);
    } catch (err: unknown) {
      setRecords([]); setMonthlyStats([]);
      setError(getErrorMessage(err, 'Unable to load dashboard'));
    } finally { setLoading(false); }
  }, [currentYear]); // EXACT DEPENDENCY MATRIX PRESERVED

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const analytics = useMemo(() => {
    const total = records.length;
    const present = records.filter(r => r.status === 'PRESENT').length;
    const late = records.filter(r => r.status === 'LATE').length;
    const halfDay = records.filter(r => r.status === 'HALF_DAY').length;
    const totalOT = records.reduce((t, r) => t + (r.overtime || 0), 0);
    const employees = new Set(records.map(r => r.employeeId)).size;
    const rate = total ? Math.round((present / total) * 100) : 0;
    return { total, present, late, halfDay, totalOT, employees, rate };
  }, [records]);

  const maxTotal = Math.max(1, ...monthlyStats.map(s => s.present + s.late + s.half_day + s.early_leave + s.absent));

  // Modernized KPI component using your Layout fonts
  const KPI = ({ label, value, icon: Icon }: { label: string; value: string | number; icon: any }) => (
    <div className="bg-zinc-50 dark:bg-zinc-900 rounded-2xl p-5 shadow-xs flex flex-col justify-between min-h">
      <div className="flex justify-between items-start">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-mono">{label}</p>
        <Icon size={14} className="text-zinc-400 dark:text-zinc-500" />
      </div>
      <p className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight font-mono mt-2">
        {loading ? '—' : value}
      </p>
    </div>
  );

  return (
    <AppSidebar>
      {/* Pure Tailwind layout with Outfit variable font applied cleanly */}
      <main className="max-w-300 mx-auto px-4 py-8 md:px-8 font-mono">
        
        {/* Header section styling updated */}
        <header className="flex items-start justify-between mb-8">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1">Attendance OS</p>
            <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">Overview</h1>
            <p className="mt-1 text-[13px] text-zinc-500 dark:text-zinc-400">
              Welcome back, <span className="text-zinc-900 dark:text-zinc-50 font-semibold">{user?.username}</span>
            </p>
          </div>
          <SyncButton onComplete={loadDashboard} />
        </header>

        {error && (
          <div className="bg-red-50 text-red-600 rounded-xl p-4 mb-6 text-xs font-semibold tracking-wide font-mono shadow-xs">
            {error}
          </div>
        )}

        {/* KPIs Grid array updated to borderless card layouts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KPI label="Total Records" value={analytics.total} icon={Activity} />
          <KPI label="Attendance Rate" value={`${analytics.rate}%`} icon={UserCheck} />
          <KPI label="Active Employees" value={analytics.employees} icon={Users} />
          <KPI label="Overtime Total" value={fmtOT(analytics.totalOT)} icon={Clock} />
        </div>

        {/* Modern Panels containing charts without heavy border styles */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Bar chart wrapper container layout */}
          <div className="bg-zinc-50 dark:bg-zinc-900 rounded-2xl p-2 shadow-sm">
            <div className="rounded-xl bg-white dark:bg-zinc-950 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-6">
                <span className="font-extrabold text-[14px] text-zinc-800 dark:text-zinc-200">Monthly Frequency</span>
                <a href="/attendance" className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 transition-colors">View all →</a>
              </div>
              
              <div className="flex items-end gap-2 h-40 pt-4 px-2">
                {monthlyStats.map(item => {
                  const total = item.present + item.late + item.half_day + item.early_leave + item.absent;
                  const h = Math.max(4, Math.round((total / maxTotal) * 100));
                  return (
                    <div key={item.month} className="flex-1 flex flex-col items-center gap-2 group">
                      <div className="w-full h-30 flex items-end justify-center">
                        <div 
                          className="w-full sm:w-[60%] bg-zinc-900 dark:bg-zinc-100 opacity-25 rounded-t-sm transition-all duration-300 group-hover:opacity-80"
                          style={{ height: `${h}%` }}
                          title={`${item.month}: ${total}`}
                        />
                      </div>
                      <span className="font-mono text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                        {item.month.slice(0, 3)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Status distribution wrapper container layout */}
          <div className="bg-zinc-50 dark:bg-zinc-900 rounded-2xl p-2 shadow-sm">
            <div className="rounded-xl bg-white dark:bg-zinc-950 p-5 shadow-xs">
              <div className="flex items-center mb-6">
                <span className="font-extrabold text-[14px] text-zinc-800 dark:text-zinc-200">Status Distribution</span>
              </div>
              
              <div className="flex flex-col gap-5 py-1">
                {[
                  { label: 'Present', value: analytics.present, color: 'bg-emerald-500' },
                  { label: 'Late', value: analytics.late, color: 'bg-amber-500' },
                  { label: 'Half Day', value: analytics.halfDay, color: 'bg-blue-500' },
                ].map(item => {
                  const w = analytics.total ? Math.max(2, Math.round((item.value / analytics.total) * 100)) : 2;
                  return (
                    <div key={item.label}>
                      <div className="flex justify-between mb-2 items-end">
                        <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">{item.label}</span>
                        <span className="font-mono text-xs font-bold text-zinc-800 dark:text-zinc-200">{item.value}</span>
                      </div>
                      <div className="h-1.5 bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${item.color} rounded-full transition-all duration-500 ease-out`} 
                          style={{ width: `${w}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      </main>
    </AppSidebar>
  );
}