'use client';

import { useEffect, useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/context/auth-context';
import { holidayService, Holiday } from '@/services/holiday-service';
import { RequestStatus } from '@/types/index';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { User, Calendar, CheckCircle2, XCircle, Clock, MessageSquare, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminHolidayPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [submittingId, setSubmittingId] = useState<number | null>(null);

  useEffect(() => { loadRequests(); }, []);

  const loadRequests = async () => {
    try {
      const data = await holidayService.getAll();
      setRequests(data);
    } catch {
      toast.error("Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  const grouped = useMemo(() => {
    return requests.reduce((acc, r) => {
      const id = r.employeeId.toString();
      if (!acc[id]) acc[id] = { name: r.employee?.name || 'Unknown', list: [] };
      acc[id].list.push(r);
      return acc;
    }, {} as Record<string, { name: string; list: Holiday[] }>);
  }, [requests]);

  const getStatusCounts = (list: Holiday[]) => ({
    pending:  list.filter(r => r.status === 'PENDING').length,
    approved: list.filter(r => r.status === 'APPROVED').length,
    rejected: list.filter(r => r.status === 'REJECTED').length,
  });

  const handleUpdateStatus = async (r: Holiday, status: RequestStatus | 'PENDING') => {
    setSubmittingId(r.id);
    try {
      const updated = await holidayService.updateStatus(r.id, status, notes[r.id] || '');
      setRequests(prev => prev.map(item => item.id === updated.id ? updated : item));
      setNotes(prev => ({ ...prev, [r.id]: '' }));
      toast.success(
        status === 'PENDING'
          ? "Request revoked — moved back to pending"
          : `Request ${status.toLowerCase()} successfully`
      );
    } catch {
      toast.error("Update failed");
    } finally {
      setSubmittingId(null);
    }
  };

  if (!user || user.role !== 'admin') return <div className="p-10">Access denied.</div>;

  return (
    <main className="max-w-6xl mx-auto p-6 grid grid-cols-[280px_1fr] gap-6 h-[calc(100vh-4rem)]">

      {/* ── Sidebar ── */}
      <div className="flex flex-col gap-1.5 overflow-y-auto pr-1">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-2">
          Employees
        </h2>
        {Object.entries(grouped).map(([id, data]) => {
          const counts = getStatusCounts(data.list);
          return (
            <button
              key={id}
              onClick={() => setSelectedEmpId(id)}
              className={cn(
                "text-left p-3 rounded-xl transition-all border",
                selectedEmpId === id
                  ? 'bg-primary/10 border-primary'
                  : 'bg-card hover:bg-muted border-border'
              )}
            >
              <div className="font-medium text-sm">{data.name}</div>
              <div className="flex gap-2 mt-1.5 flex-wrap">
                {counts.pending > 0 && (
                  <span className="flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                    <Clock className="h-2.5 w-2.5" /> {counts.pending} pending
                  </span>
                )}
                {counts.approved > 0 && (
                  <span className="flex items-center gap-1 text-[11px] text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="h-2.5 w-2.5" /> {counts.approved} approved
                  </span>
                )}
                {counts.rejected > 0 && (
                  <span className="flex items-center gap-1 text-[11px] text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                    <XCircle className="h-2.5 w-2.5" /> {counts.rejected} rejected
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Detail Panel ── */}
      <div className="bg-card rounded-2xl border flex flex-col overflow-hidden">
        {!selectedEmpId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <User className="h-8 w-8 opacity-30" />
            <p className="text-sm">Select an employee to view their requests</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-6 py-4 border-b flex items-center gap-3 bg-muted/20">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                {grouped[selectedEmpId].name.charAt(0)}
              </div>
              <div>
                <h2 className="font-semibold text-base">{grouped[selectedEmpId].name}</h2>
                <p className="text-xs text-muted-foreground">
                  {grouped[selectedEmpId].list.length} total requests
                </p>
              </div>
              {/* Summary pills */}
              <div className="ml-auto flex gap-2 flex-wrap justify-end">
                {(() => {
                  const c = getStatusCounts(grouped[selectedEmpId].list);
                  return (
                    <>
                      {c.pending > 0 && (
                        <span className="text-xs bg-amber-50 text-amber-700 px-3 py-1 rounded-full">
                          {c.pending} pending
                        </span>
                      )}
                      {c.approved > 0 && (
                        <span className="text-xs bg-green-50 text-green-700 px-3 py-1 rounded-full">
                          {c.approved} approved
                        </span>
                      )}
                      {c.rejected > 0 && (
                        <span className="text-xs bg-red-50 text-red-700 px-3 py-1 rounded-full">
                          {c.rejected} rejected
                        </span>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Request list */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {grouped[selectedEmpId].list.map((r) => {
                const isPending = r.status === 'PENDING';
                return (
                  <div
                    key={r.id}
                    className={cn(
                      "rounded-xl border overflow-hidden",
                      r.status === 'APPROVED' && "border-l-4 border-l-green-500",
                      r.status === 'REJECTED' && "border-l-4 border-l-red-500",
                      r.status === 'PENDING'  && "border-l-4 border-l-amber-400",
                    )}
                  >
                    {/* Request info row */}
                    <div className="p-4 flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                          <Calendar className="h-3 w-3" />
                          {new Date(r.startDate).toLocaleDateString()} – {new Date(r.endDate).toLocaleDateString()}
                        </div>
                        <p className="text-sm">{r.reason}</p>
                      </div>
                      <Badge
                        className={cn(
                          "shrink-0 rounded-full text-xs flex items-center gap-1",
                          r.status === 'APPROVED' && "bg-green-100 text-green-800 border-green-200",
                          r.status === 'REJECTED' && "bg-red-100 text-red-800 border-red-200",
                          r.status === 'PENDING'  && "bg-amber-50 text-amber-700 border-amber-200",
                        )}
                      >
                        {r.status === 'APPROVED' && <CheckCircle2 className="h-3 w-3" />}
                        {r.status === 'REJECTED' && <XCircle className="h-3 w-3" />}
                        {r.status === 'PENDING'  && <Clock className="h-3 w-3" />}
                        {r.status}
                      </Badge>
                    </div>

                    {/* Already resolved — note + revoke button */}
                    {!isPending && (
                      <div className="px-4 py-3 border-t bg-muted/30 flex items-center justify-between gap-2">
                        <div className="flex items-start gap-2 text-xs text-muted-foreground flex-1 min-w-0">
                          {r.adminNote ? (
                            <>
                              <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                              <span className="italic truncate">"{r.adminNote}"</span>
                            </>
                          ) : (
                            <span className="italic opacity-50">No note left</span>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleUpdateStatus(r, 'PENDING')}
                          disabled={submittingId === r.id}
                          className="rounded-full h-7 px-3 text-xs text-muted-foreground hover:text-amber-700 hover:bg-amber-50 shrink-0"
                        >
                          {submittingId === r.id
                            ? <span className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full mr-1" />
                            : <RotateCcw className="h-3 w-3 mr-1" />
                          }
                          Revoke
                        </Button>
                      </div>
                    )}

                    {/* Pending — action area */}
                    {isPending && (
                      <div className="px-4 pb-4 pt-2 border-t bg-muted/10 space-y-3">
                        <Textarea
                          placeholder="Add a note (optional)..."
                          value={notes[r.id] || ''}
                          onChange={e => setNotes(prev => ({ ...prev, [r.id]: e.target.value }))}
                          className="text-sm resize-none h-16 bg-background"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleUpdateStatus(r, 'APPROVED')}
                            disabled={submittingId === r.id}
                            className="rounded-full bg-green-600 hover:bg-green-700 text-white h-8 px-4 text-xs"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleUpdateStatus(r, 'REJECTED')}
                            disabled={submittingId === r.id}
                            className="rounded-full h-8 px-4 text-xs"
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1.5" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </main>
  );
}