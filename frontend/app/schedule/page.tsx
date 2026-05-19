'use client';
import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { Settings, Clock, Save, Coffee, Sun, Moon, Timer, Info, Database, RefreshCw } from 'lucide-react';
import { AppSidebar } from '@/components/shared/AppSidebar';

interface Schedule {
  checkInStart: string; checkInEnd: string;
  breakInStart: string; breakInEnd: string;
  breakOutStart: string; breakOutEnd: string;
  checkOutStart: string; checkOutEnd: string;
  minIntervalMinutes: number; halfDayMinutes: number; maxPunchesPerDay: number;
}

const DEFAULT: Schedule = {
  checkInStart: '08:00', checkInEnd: '10:00',
  breakInStart: '12:00', breakInEnd: '13:00',
  breakOutStart: '13:00', breakOutEnd: '14:00',
  checkOutStart: '17:00', checkOutEnd: '19:00',
  minIntervalMinutes: 5, halfDayMinutes: 240, maxPunchesPerDay: 4,
};

// --- FIXED: TimeBlock is now safely isolated outside the parent component context ---
interface TimeBlockProps {
  icon: any;
  label: string;
  startName: keyof Schedule;
  endName: keyof Schedule;
  schedule: Schedule;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const TimeBlock = ({ icon: Icon, label, startName, endName, schedule, handleChange }: TimeBlockProps) => {
  const handleMaskedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    let val = input.value.replace(/[^0-9:]/g, '');
    
    // Auto-insert a colon when typing the 2nd digit fluidly
    if (val.length === 2 && val.indexOf(':') === -1) {
      val = val + ':';
    }
    
    if (val.split(':').length > 2) return;
    
    input.value = val;
    handleChange(e);

    // This now tracks selection safely because the DOM node is persistent
    setTimeout(() => {
      const len = input.value.length;
      input.setSelectionRange(len, len);
    }, 0);
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-1.5">
        <Icon size={14} className="text-zinc-400 dark:text-zinc-500" />
        <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-[family-name:var(--font-outfit)]">
          {label}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1 block font-[family-name:var(--font-outfit)]">
            Start
          </label>
          <input 
            type="text" 
            name={startName} 
            maxLength={5}
            value={schedule[startName] as string} 
            onChange={handleMaskedChange} 
            placeholder="08:00"
            className="w-full bg-zinc-50 dark:bg-zinc-900 px-3 py-2 rounded-xl text-xs font-bold text-zinc-800 dark:text-zinc-200 border-none outline-none focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-800 transition-all font-[family-name:var(--font-mono)] tracking-wider text-center" 
          />
        </div>
        <div>
          <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1 block font-[family-name:var(--font-outfit)]">
            End
          </label>
          <input 
            type="text" 
            name={endName} 
            maxLength={5}
            value={schedule[endName] as string} 
            onChange={handleMaskedChange} 
            placeholder="17:00"
            className="w-full bg-zinc-50 dark:bg-zinc-900 px-3 py-2 rounded-xl text-xs font-bold text-zinc-800 dark:text-zinc-200 border-none outline-none focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-800 transition-all font-[family-name:var(--font-mono)] tracking-wider text-center" 
          />
        </div>
      </div>
    </div>
  );
};

// --- Main Page Component ---
export default function ScheduleSettings() {
  const [schedule, setSchedule] = useState<Schedule>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get('/schedule');
        if (res.data.success && res.data.data) setSchedule(res.data.data);
      } catch { toast.error('Failed to load schedule'); }
      finally { setLoading(false); }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiClient.put('/schedule', schedule);
      if (res.data.success) toast.success('Schedule updated');
      else toast.error('Update failed');
    } catch { toast.error('An error occurred'); }
    finally { setSaving(false); }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setSchedule(p => ({ ...p, [name]: type === 'number' ? Number(value) : value }));
  };

  if (loading) return (
    <AppSidebar>
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-6 h-6 border-2 border-zinc-200 border-t-zinc-900 dark:border-zinc-800 dark:border-t-zinc-100 rounded-full animate-spin" />
      </div>
    </AppSidebar>
  );

  return (
    <AppSidebar>
      <main className="max-w-[800px] mx-auto px-4 py-8 md:px-8 font-[family-name:var(--font-outfit)]">
        
        {/* Modern Header Section */}
        <header className="flex items-start justify-between mb-8">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1">Configuration</p>
            <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">Shift Schedule</h1>
            <p className="mt-1 text-[13px] text-zinc-500 dark:text-zinc-400">Global timing windows and attendance logic.</p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-wider font-[family-name:var(--font-outfit)]">Active</span>
          </div>
        </header>

        {/* Time Windows Panel */}
        <div className="bg-zinc-50/50 dark:bg-zinc-900/50 rounded-2xl p-2 shadow-sm mb-6">
          <div className="rounded-xl bg-white dark:bg-zinc-950 p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-zinc-100 dark:border-zinc-900">
              <Clock size={15} className="text-zinc-400 dark:text-zinc-500" />
              <span className="font-extrabold text-[14px] text-zinc-800 dark:text-zinc-200">Time Windows</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <TimeBlock icon={Sun} label="Check-In" startName="checkInStart" endName="checkInEnd" schedule={schedule} handleChange={handleChange} />
              <TimeBlock icon={Coffee} label="Break" startName="breakInStart" endName="breakInEnd" schedule={schedule} handleChange={handleChange} />
              <TimeBlock icon={Moon} label="Check-Out" startName="checkOutStart" endName="checkOutEnd" schedule={schedule} handleChange={handleChange} />
            </div>
          </div>
        </div>

        {/* Thresholds Panel */}
        <div className="bg-zinc-50/50 dark:bg-zinc-900/50 rounded-2xl p-2 shadow-sm mb-6">
          <div className="rounded-xl bg-white dark:bg-zinc-950 p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-zinc-100 dark:border-zinc-900">
              <Settings size={15} className="text-zinc-400 dark:text-zinc-500" />
              <span className="font-extrabold text-[14px] text-zinc-800 dark:text-zinc-200">Logic & Thresholds</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {[
                { label: 'Min interval (mins)', name: 'minIntervalMinutes', icon: Timer },
                { label: 'Half-day (mins)', name: 'halfDayMinutes', icon: Info },
                { label: 'Max punches/day', name: 'maxPunchesPerDay', icon: Database },
              ].map(({ label, name, icon: Icon }) => (
                <div key={name} className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <Icon size={12} className="text-zinc-400 dark:text-zinc-500" />
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-[family-name:var(--font-outfit)]">
                      {label}
                    </label>
                  </div>
                  <input 
                    type="number" 
                    name={name} 
                    value={(schedule as any)[name]} 
                    onChange={handleChange} 
                    min={0} 
                    className="w-full bg-zinc-50 dark:bg-zinc-900 px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 border-none outline-none focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-800 transition-all font-[family-name:var(--font-mono)]" 
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action button */}
        <div className="flex justify-end">
          <button 
            type="button"
            onClick={handleSave} 
            disabled={saving} 
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 text-xs font-semibold shadow-xs hover:opacity-90 disabled:opacity-50 transition-all active:scale-[0.98] min-w-[160px]"
          >
            {saving ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <>
                <Save size={14} strokeWidth={2.5} />
                <span>Save Schedule</span>
              </>
            )}
          </button>
        </div>
      </main>
    </AppSidebar>
  );
}