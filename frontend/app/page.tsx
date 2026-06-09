'use client';

import { useEffect, useState, useMemo } from 'react';
import { AppSidebar } from '@/components/shared/AppSidebar';
import { apiClient } from '@/lib/api';
import { WorkRecord } from '@/types';
import { toast } from 'sonner';
import { Activity, Users, Clock, UserCheck, CalendarDays } from 'lucide-react';
import { getErrorMessage } from '@/lib/get-error-message';
import { DataTable, Column } from '@/components/ui/DataTable';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface EmployeeSummary {
  employeeId: string;
  name: string;
  department: string;
  present: number;
  late: number;
  halfDay: number;
  absent: number;
  totalOvertime: number;
  totalLogs: number;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const fmtOT = (m: number) => {
  if (!m || isNaN(m) || m <= 0) return '0m';
  const h = Math.floor(m / 60), r = m % 60;
  return h ? (r ? `${h}h ${r}m` : `${h}h`) : `${r}m`;
};

const EM_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'
];

export default function EmployeeStatsPage() {
  const [allRecords, setAllRecords] = useState<WorkRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null); // null = full year

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const currentYear = new Date().getFullYear();
        const res = await apiClient.get(`/attendance/yearly?year=${currentYear}`);
        if (res.data.success) {
          setAllRecords(res.data.data);
        }
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to calculate stats'));
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  // Filter records by selected month (or all if null)
  const filteredRecords = useMemo(() => {
    if (selectedMonth === null) return allRecords;
    return allRecords.filter(r => new Date(r.date).getMonth() === selectedMonth);
  }, [allRecords, selectedMonth]);

  const summaries = useMemo(() => {
    const map = new Map<string, EmployeeSummary>();
    filteredRecords.forEach(r => {
      if (!map.has(r.employeeId)) {
        map.set(r.employeeId, {
          employeeId: r.employeeId,
          name: r.employee?.name || `ID: ${r.employeeId}`,
          department: r.employee?.department || 'Staff',
          present: 0, late: 0, halfDay: 0, absent: 0, totalOvertime: 0, totalLogs: 0,
        });
      }
      const s = map.get(r.employeeId)!;
      if (r.status === 'PRESENT') s.present++;
      if (r.status === 'LATE') s.late++;
      if (r.status === 'HALF_DAY') s.halfDay++;
      if (r.status === 'ABSENT') s.absent++;
      s.totalOvertime += (r.overtime || 0);
      s.totalLogs++;
    });
    return Array.from(map.values());
  }, [filteredRecords]);

  const analytics = useMemo(() => {
    let present = 0, late = 0, halfDay = 0, absent = 0, totalOT = 0;
    summaries.forEach(s => {
      present += s.present; late += s.late;
      halfDay += s.halfDay; absent += s.absent;
      totalOT += s.totalOvertime;
    });
    const total = filteredRecords.length;
    const rate = total ? Math.round(((present + late) / total) * 100) : 0;
    return { present, late, halfDay, absent, totalOT, rate, total };
  }, [summaries, filteredRecords]);

  const employeePieData = useMemo(() => summaries.map((s, idx) => ({
    name: s.name, value: s.totalLogs,
    present: s.present, late: s.late, halfDay: s.halfDay, absent: s.absent,
    color: EM_COLORS[idx % EM_COLORS.length],
  })), [summaries]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-zinc-950 p-3 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl text-xs z-50">
          <p className="font-extrabold text-zinc-900 dark:text-zinc-50 mb-1">{data.name}</p>
          <div className="space-y-0.5 text-zinc-500 font-mono">
            <p className="text-emerald-500">Present: {data.present}</p>
            <p className="text-amber-500">Late: {data.late}</p>
            <p className="text-blue-500">Half Day: {data.halfDay}</p>
            <p className="text-rose-500">Absent: {data.absent}</p>
            <p className="border-t border-zinc-100 dark:border-zinc-900 mt-1 pt-1 font-bold text-zinc-700 dark:text-zinc-300">Total: {data.value} logs</p>
          </div>
        </div>
      );
    }
    return null;
  };

  const columns: Column<EmployeeSummary>[] = [
    {
      header: 'Employee Profile',
      accessor: (s) => (
        <div className="min-w-37.5">
          <p className="font-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">{s.name}</p>
          <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 dark:text-zinc-500">{s.department}</p>
        </div>
      )
    },
    {
      header: 'Present',
      accessor: (s) => (
        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30">
          {s.present}
        </span>
      ),
      align: 'center',
    },
    {
      header: 'Late',
      accessor: (s) => (
        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-600 dark:bg-amber-950/30">
          {s.late}
        </span>
      ),
      align: 'center',
    },
    {
      header: 'Half Day',
      accessor: (s) => (
        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-600 dark:bg-blue-950/30">
          {s.halfDay}
        </span>
      ),
      align: 'center',
    },
    {
      header: 'Absent',
      accessor: (s) => (
        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-600 dark:bg-rose-950/30">
          {s.absent}
        </span>
      ),
      align: 'center',
    },
    {
      header: 'Accumulated Overtime',
      accessor: (s) => (
        <span className="font-mono text-xs font-bold text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
          {fmtOT(s.totalOvertime)}
        </span>
      )
    },
  ];

  const KPI = ({ label, value, icon: Icon }: { label: string; value: string | number; icon: any }) => (
    <div className="bg-zinc-50 dark:bg-zinc-900 rounded-2xl p-5 shadow-xs flex flex-col justify-between min-h-27.5">
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
    <div className="overflow-x-hidden h-screen">
      <AppSidebar>
        <div className="w-full max-w-7xl mx-auto px-4 py-6 md:px-8 font-outfit text-zinc-900 dark:text-zinc-50 overflow-x-hidden min-w-0">

          {/* Header */}
          <header className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1 font-mono">Global Systems Ledger</p>
              <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">Executive Analytics Dashboard</h1>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Filterless data breakdown matrix profiles</p>
            </div>

            {/* Month Selector */}
            <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 w-fit">
              <CalendarDays size={13} className="text-zinc-400 shrink-0" />
              <select
                value={selectedMonth ?? 'all'}
                onChange={e => setSelectedMonth(e.target.value === 'all' ? null : Number(e.target.value))}
                className="bg-transparent text-xs font-bold text-zinc-700 dark:text-zinc-300 outline-none cursor-pointer"
              >
                <option value="all">Full Year</option>
                {MONTHS.map((m, i) => (
                  <option key={m} value={i}>{m}</option>
                ))}
              </select>
            </div>
          </header>

          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 w-full auto-rows-fr">
            <KPI label="Total Matrix Logs" value={analytics.total} icon={Activity} />
            <KPI label="Attendance Rate" value={`${analytics.rate}%`} icon={UserCheck} />
            <KPI label="Active Headcount" value={summaries.length} icon={Users} />
            <KPI label="Aggregated Overtime" value={fmtOT(analytics.totalOT)} icon={Clock} />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 w-full min-w-0">

            <div className="bg-zinc-50 dark:bg-zinc-900 rounded-2xl p-2 shadow-sm lg:col-span-2 w-full min-w-0 overflow-hidden">
              <div className="rounded-xl bg-white dark:bg-zinc-950 p-4 md:p-5 shadow-xs h-105 md:h-95 flex flex-col justify-between overflow-hidden">
                <div>
                  <h2 className="font-extrabold text-sm text-zinc-800 dark:text-zinc-200">Employee Attendance Share</h2>
                  <p className="text-[11px] text-zinc-400">
                    {selectedMonth !== null ? `${MONTHS[selectedMonth]} breakdown` : 'Hover over slices to review exact attendance datasets'}
                  </p>
                </div>
                <div className="w-full h-64 relative mt-2 overflow-hidden">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                      <Pie data={employeePieData} cx="50%" cy="45%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                        {employeePieData.map((entry, index) => (
                          <Cell key={`cell-emp-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        layout="horizontal" verticalAlign="bottom" align="center" iconSize={8}
                        wrapperStyle={{ fontSize: '10px', maxHeight: '55px', overflowY: 'auto', paddingTop: '10px', width: '100%' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-900 rounded-2xl p-2 shadow-sm lg:col-span-1 w-full min-w-0 overflow-hidden">
              <div className="rounded-xl bg-white dark:bg-zinc-950 p-5 shadow-xs h-95 flex flex-col justify-between overflow-hidden">
                <h2 className="font-extrabold text-sm text-zinc-800 dark:text-zinc-200">Total System Metrics</h2>
                <div className="flex flex-col gap-4 py-1 grow justify-center">
                  {[
                    { label: 'Present', value: analytics.present, color: 'bg-emerald-500' },
                    { label: 'Late', value: analytics.late, color: 'bg-amber-500' },
                    { label: 'Half Day', value: analytics.halfDay, color: 'bg-blue-500' },
                    { label: 'Absent', value: analytics.absent, color: 'bg-rose-500' },
                  ].map(item => {
                    const w = analytics.total ? Math.max(2, Math.round((item.value / analytics.total) * 100)) : 2;
                    return (
                      <div key={item.label}>
                        <div className="flex justify-between mb-1 items-end">
                          <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">{item.label}</span>
                          <span className="font-mono text-xs font-bold text-zinc-800 dark:text-zinc-200">{item.value}</span>
                        </div>
                        <div className="h-1.5 bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden">
                          <div className={`h-full ${item.color} rounded-full transition-all duration-500 ease-out`} style={{ width: `${w}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>

          {/* Table */}
          <div className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-900 flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-zinc-800 dark:text-zinc-200">Staff Performance Ledger Index</h3>
              {selectedMonth !== null && (
                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500 dark:text-blue-400 font-mono">
                  {MONTHS[selectedMonth]}
                </span>
              )}
            </div>
            <div className="w-full overflow-x-auto">
              <DataTable
                columns={columns}
                data={summaries}
                loading={loading}
                rowId={(s) => s.employeeId}
              />
            </div>
          </div>

        </div>
      </AppSidebar>
    </div>
  );
}