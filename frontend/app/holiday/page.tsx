'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/context/auth-context';
import { holidayService, Holiday } from '@/services/holiday-service';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Send, Clock, CheckCircle2, XCircle, MessageSquare, Loader2 } from "lucide-react";

export default function HolidayPage() {
  const { user, isLoading } = useAuth();
  const [requests, setRequests] = useState<Holiday[]>([]);
  const [formData, setFormData] = useState({ startDate: '', endDate: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  // This ref acts as the anchor point at the bottom of the chat
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get current date in YYYY-MM-DD format to disable past dates
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => { if (user) loadRequests(); }, [user]);

  // Scroll to bottom whenever requests change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [requests]);

  const loadRequests = async () => {
    try {
      const data = await holidayService.getMine();
      setRequests(data.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()));
    } catch { toast.error("Failed to load requests"); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error("Please log in.");
    setSubmitting(true);
    try {
      await holidayService.create(formData);
      setFormData({ startDate: '', endDate: '', reason: '' });
      await loadRequests();
      toast.success("Request sent!");
    } catch { toast.error("Session expired."); }
    finally { setSubmitting(false); }
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] max-w-7xl mx-auto border bg-background/50 rounded-xl overflow-hidden shadow-sm">
      <div className="p-4 border-b bg-card font-semibold flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-primary" /> 
        Leave Request Chat
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6" ref={scrollRef}>
        {requests.length === 0 && (
          <p className="text-center text-muted-foreground mt-10">No leave requests found.</p>
        )}
        
        {requests.map(r => (
          <div key={r.id} className="space-y-4">
            <div className="flex flex-col items-end">
              <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm p-4 max-w-[85%] shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider opacity-70 mb-1">You</p>
                <p className="text-sm font-medium">{new Date(r.startDate).toLocaleDateString()} — {new Date(r.endDate).toLocaleDateString()}</p>
                <p className="text-sm mt-2 leading-relaxed">{r.reason}</p>
              </div>
            </div>

            {r.status !== 'PENDING' || r.adminNote ? (
              <div className="flex flex-col items-start">
                <div className="bg-card border rounded-2xl rounded-tl-sm p-4 max-w-[85%] shadow-sm">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Manager</p>
                  {r.adminNote && <p className="text-sm text-foreground">{r.adminNote}</p>}
                  <div className="mt-3 flex items-center gap-2">
                    <span className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${
                      r.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 
                      r.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {r.status === 'APPROVED' && <CheckCircle2 className="h-3 w-3" />}
                      {r.status === 'REJECTED' && <XCircle className="h-3 w-3" />}
                      {r.status === 'PENDING' && <Clock className="h-3 w-3" />}
                      {r.status}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ))}
        {/* Anchor point for auto-scroll */}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-card border-t">
        <form onSubmit={handleSubmit} className="flex gap-2 items-end bg-background rounded-2xl border p-1 shadow-inner">
          <div className="flex-1 space-y-1 p-2">
            <div className="flex gap-2">
              <Input type="date" min={today} required className="h-9 border-0 bg-transparent text-sm" onChange={e => setFormData({...formData, startDate: e.target.value})} value={formData.startDate} />
              <Input type="date" min={formData.startDate || today} required className="h-9 border-0 bg-transparent text-sm" onChange={e => setFormData({...formData, endDate: e.target.value})} value={formData.endDate} />
            </div>
            <Textarea placeholder="Explain your reason..." className="border-0 focus-visible:ring-0 min-h-15 text-sm resize-none bg-transparent" 
              onChange={e => setFormData({...formData, reason: e.target.value})} value={formData.reason} />
          </div>
          <Button size="icon" className="rounded-xl h-12 w-12 shrink-0" disabled={submitting || !formData.reason}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}