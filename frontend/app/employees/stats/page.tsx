'use client';

import { useEffect, useState } from 'react';
import { AppSidebar } from '@/components/shared/AppSidebar';
import { apiClient } from '@/lib/api';
import { WorkRecord } from '@/types';
import { toast } from 'sonner';
import { 
  TrendingUp, 
  Users, 
  Calendar, 
  Clock, 
  Award,
  Zap,
  Activity,
  UserCheck,
  Timer,
  AlertCircle
} from 'lucide-react';
import { getErrorMessage } from '@/lib/get-error-message';

import { DataTable, Column } from '@/components/ui/DataTable';

interface EmployeeSummary {
  employeeId: string;
  name: string;
  department: string;
  present: number;
  late: number;
  halfDay: number;
  absent: number;
  totalOvertime: number;
}

export default function EmployeeStatsPage() {
  const [summaries, setSummaries] = useState<EmployeeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get(`/attendance/yearly?year=${year}`);
        if (res.data.success) {
          const records: WorkRecord[] = res.data.data;
          const map = new Map<string, EmployeeSummary>();
          
          records.forEach(r => {
            if (!map.has(r.employeeId)) {
              map.set(r.employeeId, {
                employeeId: r.employeeId,
                name: r.employee?.name || `ID: ${r.employeeId}`,
                department: r.employee?.department || 'Staff',
                present: 0,
                late: 0,
                halfDay: 0,
                absent: 0,
                totalOvertime: 0,
              });
            }
            const s = map.get(r.employeeId)!;
            if (r.status === 'PRESENT') s.present++;
            if (r.status === 'LATE') s.late++;
            if (r.status === 'HALF_DAY') s.halfDay++;
            if (r.status === 'ABSENT') s.absent++;
            s.totalOvertime += (r.overtime || 0);
          });
          setSummaries(Array.from(map.values()));
        }
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to calculate employee stats'));
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [year]);

  const formatOvertime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const columns: Column<EmployeeSummary>[] = [
    {
      header: 'Employee',
      accessor: (s) => (
        <div>
          <p className="font-bold">{s.name}</p>
          <p className="text-[10px] uppercase tracking-tighter opacity-50">{s.department} · {s.employeeId}</p>
        </div>
      ),
    },
    {
      header: 'P',
      accessor: (s) => s.present.toString().padStart(2, '0'),
      mono: true,
      align: 'center',
    },
    {
      header: 'L',
      accessor: (s) => s.late.toString().padStart(2, '0'),
      mono: true,
      align: 'center',
    },
    {
      header: 'H',
      accessor: (s) => s.halfDay.toString().padStart(2, '0'),
      mono: true,
      align: 'center',
    },
    {
      header: 'A',
      accessor: (s) => s.absent.toString().padStart(2, '0'),
      mono: true,
      align: 'center',
    },
    {
      header: 'Overtime',
      accessor: (s) => formatOvertime(s.totalOvertime),
      mono: true,
    },
    {
      header: 'Reliability',
      align: 'right',
      accessor: (s) => {
        const total = s.present + s.late + s.halfDay + s.absent;
        const rate = total > 0 ? Math.round(((s.present + s.late) / total) * 100) : 0;
        return (
          <div className="flex items-center justify-end gap-3 min-w-[120px]">
             <div className="h-1.5 flex-1 bg-muted/30 rounded-full overflow-hidden">
               <div 
                 className="h-full bg-indigo-500 rounded-full transition-all duration-1000" 
                 style={{ width: `${rate}%` }} 
               />
             </div>
             <span className="font-semibold text-xs text-foreground w-8 text-right">{rate}%</span>
          </div>
        );
      },
    },
  ];

  return (
    <AppSidebar>
      <main className="mx-auto max-w-7xl px-6 py-12 lg:px-12">
        <header className="mb-14">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Analytics</h1>
            <div className="flex items-center gap-3">
               <Calendar size={14} className="text-muted-foreground" />
               <select 
                 value={year} 
                 onChange={(e) => setYear(Number(e.target.value))}
                 className="bg-muted/50 border border-border/50 px-4 py-2 text-xs font-semibold rounded-lg outline-none cursor-pointer hover:bg-muted transition-colors text-foreground"
               >
                 {Array.from({ length: new Date().getFullYear() - 2020 + 1 }, (_, i) => 2020 + i).reverse().map(y => (
                   <option key={y} value={y}>{y}</option>
                 ))}
               </select>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Employee performance and reliability metrics for <span className="text-foreground font-medium">{year}</span>.
          </p>
        </header>

        <div className="mb-8">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Employee Summary</h2>
        </div>

        <DataTable 
          columns={columns} 
          data={summaries} 
          loading={loading} 
          rowId={(s) => s.employeeId}
          emptyMessage="No performance data available for this period."
        />
      </main>
    </AppSidebar>
  );
}
