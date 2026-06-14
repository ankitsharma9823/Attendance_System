"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { attendanceService } from "@/services/attendance-service";
import { WorkRecord, AttendanceStatus } from "@/types";
import { toast } from "sonner";
import { SyncButton } from "../../components/shared/SyncButton";
import { getErrorMessage } from "@/lib/get-error-message";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_OPTIONS: AttendanceStatus[] = [
  "PRESENT",
  "LATE",
  "ABSENT",
  "HALF_DAY",
  "EARLY_LEAVE",
  "LEAVE",
];

const fmtTime = (t: string | null) =>
  t
    ? new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kathmandu",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }).format(new Date(t))
    : "—";

const fmtOT = (m: number | null | undefined) => {
  if (!m || isNaN(m) || m <= 0) return "—";
  const h = Math.floor(m / 60),
    r = m % 60;
  return `${h > 0 ? h + "h " : ""}${r > 0 ? r + "m" : ""}`;
};

const STATUS_STYLES: Record<string, string> = {
  PRESENT: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/80",
  LATE: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100/80",
  ABSENT: "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100/80",
  HALF_DAY: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100/80",
  EARLY_LEAVE: "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100/80",
  LEAVE: "bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100/80",
};

export default function AttendanceLedger() {
  const [records, setRecords] = useState<WorkRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await attendanceService.getAttendance({
        date: selectedDate,
      });
      setRecords(data);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load"));
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatusChange = async (
    record: WorkRecord,
    nextStatus: AttendanceStatus,
  ) => {
    try {
      setRecords((prev) =>
        prev.map((rec) =>
          rec.employeeId === record.employeeId
            ? { ...rec, status: nextStatus }
            : rec,
        ),
      );
      const response = await attendanceService.updateStatus(
        record.id ?? 0,
        nextStatus,
        record.employeeId,
        record.date,
      );
      if (response.success) {
        toast.success("Status updated");
        loadData();
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to update status"));
      loadData();
    }
  };

  const stats = useMemo(
    () => ({
      present: records.filter(
        (r) => r.status === "PRESENT" || r.status === "LATE",
      ).length,
      absent: records.filter((r) => r.status === "ABSENT").length,
      leave: records.filter((r) => r.status === "LEAVE").length,
      ot: records.reduce((t, r) => t + (Number(r.overtime) || 0), 0),
    }),
    [records],
  );

  return (
    <main className="w-full px-6 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Attendance Ledger</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Daily attendance overview and manual override management.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total Present",
            val: stats.present,
            color: "text-emerald-600",
          },
          { label: "Total Absent", val: stats.absent, color: "text-rose-600" },
          { label: "On Leave", val: stats.leave, color: "text-sky-600" },
          {
            label: "Total Overtime",
            val: fmtOT(stats.ot),
            color: "text-foreground",
          },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-5 pb-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {s.label}
              </p>
              {loading ? (
                <Skeleton className="h-8 w-16 mt-2" />
              ) : (
                <p className={`text-3xl font-bold mt-1 font-mono ${s.color}`}>
                  {s.val}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Daily Logs
        </p>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            max={new Date().toISOString().split("T")[0]}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-40 text-sm"
          />
          <SyncButton onComplete={loadData} />
        </div>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Check In / Out</TableHead>
              <TableHead>Break Out / In</TableHead>
              <TableHead>Overtime</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : records.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground py-16 text-sm"
                >
                  No records found for this date.
                </TableCell>
              </TableRow>
            ) : (
              records.map((r) => (
                <TableRow key={r.id ?? r.employeeId}>
                  <TableCell className="font-medium">
                    {r.employee?.name || r.employeeId}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {fmtTime(r.checkIn)} – {fmtTime(r.checkOut)}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {fmtTime(r.breakOut)} – {fmtTime(r.breakIn)}
                  </TableCell>
                  <TableCell className="font-mono text-xs font-semibold">
                    {fmtOT(r.overtime)}
                  </TableCell>
                  <TableCell>
                    {/* FIXED: Swapped out Select for DropdownMenu to prevent standard table click-interception bugs */}
                    <DropdownMenu>
                      <DropdownMenuTrigger className="outline-none focus:outline-none focus:ring-0 bg-transparent border-none p-0 m-0 cursor-pointer block">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 transition-all select-none ${STATUS_STYLES[r.status] || "bg-muted text-muted-foreground"}`}
                        >
                          {r.status.replace("_", " ")} ▾
                        </Badge>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="p-1 min-w-[120px]">
                        {STATUS_OPTIONS.map((opt) => (
                          <DropdownMenuItem
                            key={opt}
                            onClick={() => handleStatusChange(r, opt)}
                            className="cursor-pointer flex items-center justify-start p-1 hover:bg-accent rounded-sm"
                          >
                            <Badge
                              variant="outline"
                              className={`text-[10px] w-full text-center font-semibold uppercase tracking-wide px-2 py-0.5 pointer-events-none ${STATUS_STYLES[opt] || ""}`}
                            >
                              {opt.replace("_", " ")}
                            </Badge>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </main>
  );
}