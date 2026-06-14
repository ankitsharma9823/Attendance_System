'use client';

import { useEffect, useState, useMemo } from 'react';
import { apiClient } from '@/lib/api';
import { WorkRecord } from '@/types';
import { toast } from 'sonner';
import { Activity, Users, Clock, UserCheck, Loader2 } from 'lucide-react';
import { getErrorMessage } from '@/lib/get-error-message';

// Shadcn UI & Recharts
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid, LineChart, Line } from 'recharts';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function EmployeeStatsPage() {
  const [allRecords, setAllRecords] = useState<WorkRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get(`/attendance/yearly?year=${new Date().getFullYear()}`);
        if (res.data?.success) setAllRecords(res.data.data);
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to load stats'));
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const summaries = useMemo(() => {
    const map = new Map<string, any>();
    const records = selectedMonth === 'all' 
      ? allRecords 
      : allRecords.filter(r => new Date(r.date).getMonth() === parseInt(selectedMonth));

    records.forEach(r => {
      if (!map.has(r.employeeId)) {
        map.set(r.employeeId, { id: r.employeeId, name: r.employee?.name || 'Unknown', p: 0, l: 0, a: 0, ot: 0 });
      }
      const s = map.get(r.employeeId);
      if (r.status === 'PRESENT') s.p++;
      else if (r.status === 'LATE') s.l++;
      else if (r.status === 'ABSENT') s.a++;
      s.ot += (r.overtime || 0);
    });
    return Array.from(map.values());
  }, [allRecords, selectedMonth]);

  const analytics = useMemo(() => {
    const total = summaries.reduce((acc, s) => acc + s.p + s.l + s.a, 0);
    const present = summaries.reduce((acc, s) => acc + s.p + s.l, 0);
    return { 
        totalLogs: total, 
        rate: total ? Math.round((present / total) * 100) : 0,
        totalOT: summaries.reduce((acc, s) => acc + s.ot, 0)
    };
  }, [summaries]);

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-8 w-8" /></div>;

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Executive Analytics</h1>
          <p className="text-muted-foreground">Attendance and Performance Visualizations</p>
        </div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-45"><SelectValue placeholder="Select Month" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Full Year</SelectItem>
            {MONTHS.map((m, i) => <SelectItem key={m} value={i.toString()}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard label="Total Logs" value={analytics.totalLogs} icon={Activity} />
        <KPICard label="Attendance Rate" value={`${analytics.rate}%`} icon={UserCheck} />
        <KPICard label="Total Overtime" value={`${analytics.totalOT}m`} icon={Clock} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-bold mb-4">Attendance Distribution</h2>
          <div className="h-75 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summaries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="p" fill="#10b981" name="Present" />
                <Bar dataKey="l" fill="#f59e0b" name="Late" />
                <Bar dataKey="a" fill="#ef4444" name="Absent" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-bold mb-4">Overtime Trend</h2>
          <div className="h-75 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={summaries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="ot" stroke="#3b82f6" strokeWidth={2} name="Overtime" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Staff Performance Ledger</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead className="text-center">Present</TableHead>
                <TableHead className="text-center">Late</TableHead>
                <TableHead className="text-center">Absent</TableHead>
                <TableHead className="text-right">Overtime (m)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaries.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-semibold">{s.name}</TableCell>
                  <TableCell className="text-center">{s.p}</TableCell>
                  <TableCell className="text-center">{s.l}</TableCell>
                  <TableCell className="text-center">{s.a}</TableCell>
                  <TableCell className="text-right font-mono">{s.ot}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function KPICard({ label, value, icon: Icon }: any) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{value}</div></CardContent>
        </Card>
    )
}