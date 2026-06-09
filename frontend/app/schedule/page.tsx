// 'use client';
// import React, { useState, useEffect } from 'react';
// import { apiClient } from '@/lib/api';
// import { toast } from 'sonner';
// import { Settings, Clock, Save, Coffee, Sun, Moon, Timer, Info, Database, RefreshCw, AlertTriangle } from 'lucide-react';
// import { AppSidebar } from '@/components/shared/AppSidebar';

// interface Schedule {
//   checkInStart: string; checkInEnd: string;
//   breakInStart: string; breakInEnd: string;
//   breakOutStart: string; breakOutEnd: string;
//   checkOutStart: string; checkOutEnd: string;
//   minIntervalMinutes: number; halfDayMinutes: number; maxPunchesPerDay: number;
// }

// const DEFAULT: Schedule = {
//   checkInStart: '08:00', checkInEnd: '10:00',
//   breakInStart: '12:00', breakInEnd: '13:00',
//   breakOutStart: '13:00', breakOutEnd: '14:00',
//   checkOutStart: '17:00', checkOutEnd: '19:00',
//   minIntervalMinutes: 5, halfDayMinutes: 240, maxPunchesPerDay: 4,
// };

// // ─── Validation ───────────────────────────────────────────────────────────────

// const toMins = (t: string): number => {
//   const [h, m] = t.split(':').map(Number);
//   return isNaN(h) || isNaN(m) ? -1 : h * 60 + m;
// };

// const isValidTime = (t: string): boolean => {
//   if (!t || !/^\d{2}:\d{2}$/.test(t)) return false;
//   const [h, m] = t.split(':').map(Number);
//   return h >= 0 && h <= 23 && m >= 0 && m <= 59;
// };

// const validateSchedule = (s: Schedule): string | null => {
//   const windows = [
//     { label: 'Check-In',  start: s.checkInStart,  end: s.checkInEnd },
//     { label: 'Break-In',  start: s.breakInStart,  end: s.breakInEnd },
//     { label: 'Break-Out', start: s.breakOutStart, end: s.breakOutEnd },
//     { label: 'Check-Out', start: s.checkOutStart, end: s.checkOutEnd },
//   ];

//   for (const w of windows) {
//     if (!isValidTime(w.start)) return `${w.label} Start: invalid format. Use HH:MM (e.g. 09:00)`;
//     if (!isValidTime(w.end))   return `${w.label} End: invalid format. Use HH:MM (e.g. 17:00)`;
//     if (toMins(w.end) <= toMins(w.start))
//       return `${w.label}: End time must be after Start time`;
//   }

//   if (s.minIntervalMinutes < 1)              return 'Min interval must be at least 1 minute';
//   if (s.halfDayMinutes < 1)                  return 'Half-day minutes must be at least 1';
//   if (s.maxPunchesPerDay < 1 || s.maxPunchesPerDay > 10) return 'Max punches must be between 1 and 10';

//   return null;
// };

// // ─── TimeBlock Component ──────────────────────────────────────────────────────

// interface TimeBlockProps {
//   icon: any;
//   label: string;
//   startName: keyof Schedule;
//   endName: keyof Schedule;
//   schedule: Schedule;
//   handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
// }

// const TimeBlock = ({ icon: Icon, label, startName, endName, schedule, handleChange }: TimeBlockProps) => {
//   const startVal = schedule[startName] as string;
//   const endVal   = schedule[endName]   as string;

//   const startValid    = isValidTime(startVal);
//   const endValid      = isValidTime(endVal);
//   const isInvalid     = startValid && endValid && toMins(endVal) <= toMins(startVal);

//   const handleMaskedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const input = e.target;
//     let val = input.value.replace(/[^0-9:]/g, '');
//     if (val.length === 2 && !val.includes(':')) val = val + ':';
//     if (val.split(':').length > 2) return;
//     input.value = val;
//     handleChange(e);
//     setTimeout(() => {
//       const len = input.value.length;
//       input.setSelectionRange(len, len);
//     }, 0);
//   };

//   const base   = `w-full px-3 py-2 rounded-xl text-xs font-bold border-none outline-none transition-all font-[family-name:var(--font-mono)] tracking-wider text-center focus:ring-2`;
//   const normal = `${base} bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 focus:ring-zinc-200 dark:focus:ring-zinc-800`;
//   const error  = `${base} bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 focus:ring-red-200 dark:focus:ring-red-900`;

//   return (
//     <div className="flex flex-col gap-2.5">
//       <div className="flex items-center gap-1.5 flex-wrap">
//         <Icon size={14} className="text-zinc-400 dark:text-zinc-500" />
//         <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-[family-name:var(--font-outfit)]">
//           {label}
//         </span>
//         {isInvalid && (
//           <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-red-500">
//             <AlertTriangle size={9} />
//             End must be after Start
//           </span>
//         )}
//       </div>
//       <div className="grid grid-cols-2 gap-3">
//         <div>
//           <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1 block font-[family-name:var(--font-outfit)]">
//             Start
//           </label>
//           <input
//             type="text"
//             name={startName}
//             maxLength={5}
//             value={startVal}
//             onChange={handleMaskedChange}
//             placeholder="08:00"
//             className={normal}
//           />
//         </div>
//         <div>
//           <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1 block font-[family-name:var(--font-outfit)]">
//             End
//           </label>
//           <input
//             type="text"
//             name={endName}
//             maxLength={5}
//             value={endVal}
//             onChange={handleMaskedChange}
//             placeholder="17:00"
//             className={isInvalid ? error : normal}
//           />
//         </div>
//       </div>
//     </div>
//   );
// };


// export default function ScheduleSettings() {
//   const [schedule, setSchedule] = useState<Schedule>(DEFAULT);
//   const [loading,  setLoading]  = useState(true);
//   const [saving,   setSaving]   = useState(false);

//   useEffect(() => {
//     (async () => {
//       try {
//         const res = await apiClient.get('/schedule');
//         if (res.data.success && res.data.data) setSchedule(res.data.data);
//       } catch {
//         toast.error('Failed to load schedule');
//       } finally {
//         setLoading(false);
//       }
//     })();
//   }, []);

//   const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const { name, value, type } = e.target;
//     setSchedule(p => ({ ...p, [name]: type === 'number' ? Number(value) : value }));
//   };

//   const hasInvalidWindows = (): boolean => {
//     const windows = [
//       { start: schedule.checkInStart,  end: schedule.checkInEnd },
//       { start: schedule.breakInStart,  end: schedule.breakInEnd },
//       { start: schedule.breakOutStart, end: schedule.breakOutEnd },
//       { start: schedule.checkOutStart, end: schedule.checkOutEnd },
//     ];
//     return windows.some(
//       w => isValidTime(w.start) && isValidTime(w.end) && toMins(w.end) <= toMins(w.start)
//     );
//   };

//   const handleSave = async () => {
//     const error = validateSchedule(schedule);
//     if (error) {
//       toast.error(error);
//       return;
//     }

//     setSaving(true);
//     try {
//       const res = await apiClient.put('/schedule', schedule);
//       if (res.data.success) toast.success('Schedule updated successfully');
//       else toast.error(res.data.message || 'Update failed');
//     } catch {
//       toast.error('An error occurred while saving');
//     } finally {
//       setSaving(false);
//     }
//   };

//   if (loading) return (
//     <AppSidebar>
//       <div className="flex items-center justify-center h-[60vh]">
//         <div className="w-6 h-6 border-2 border-zinc-200 border-t-zinc-900 dark:border-zinc-800 dark:border-t-zinc-100 rounded-full animate-spin" />
//       </div>
//     </AppSidebar>
//   );

//   return (
//     <AppSidebar>
//       <main className="max-w-[800px] mx-auto px-4 py-8 md:px-8 font-[family-name:var(--font-outfit)]">

//         {/* Header */}
//         <header className="flex items-start justify-between mb-8">
//           <div>
//             <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1">Configuration</p>
//             <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">Shift Schedule</h1>
//             <p className="mt-1 text-[13px] text-zinc-500 dark:text-zinc-400">Global timing windows and attendance logic.</p>
//           </div>
//           <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
//             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
//             <span className="text-[10px] font-bold uppercase tracking-wider font-[family-name:var(--font-outfit)]">Active</span>
//           </div>
//         </header>

//         {/* Time Windows Panel */}
//         <div className="bg-zinc-50/50 dark:bg-zinc-900/50 rounded-2xl p-2 shadow-sm mb-6">
//           <div className="rounded-xl bg-white dark:bg-zinc-950 p-5 shadow-xs">
//             <div className="flex items-center gap-2 mb-6 pb-4 border-b border-zinc-100 dark:border-zinc-900">
//               <Clock size={15} className="text-zinc-400 dark:text-zinc-500" />
//               <span className="font-extrabold text-[14px] text-zinc-800 dark:text-zinc-200">Time Windows</span>
//             </div>
//             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//               <TimeBlock icon={Sun}    label="Check-In"  startName="checkInStart"  endName="checkInEnd"  schedule={schedule} handleChange={handleChange} />
//               <TimeBlock icon={Coffee} label="Break"     startName="breakInStart"  endName="breakInEnd"  schedule={schedule} handleChange={handleChange} />
//               <TimeBlock icon={Moon}   label="Check-Out" startName="checkOutStart" endName="checkOutEnd" schedule={schedule} handleChange={handleChange} />
//             </div>
//           </div>
//         </div>

//         {/* Logic & Thresholds Panel */}
//         <div className="bg-zinc-50/50 dark:bg-zinc-900/50 rounded-2xl p-2 shadow-sm mb-6">
//           <div className="rounded-xl bg-white dark:bg-zinc-950 p-5 shadow-xs">
//             <div className="flex items-center gap-2 mb-6 pb-4 border-b border-zinc-100 dark:border-zinc-900">
//               <Settings size={15} className="text-zinc-400 dark:text-zinc-500" />
//               <span className="font-extrabold text-[14px] text-zinc-800 dark:text-zinc-200">Logic & Thresholds</span>
//             </div>
//             <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
//               {[
//                 { label: 'Min interval (mins)', name: 'minIntervalMinutes', icon: Timer },
//                 { label: 'Half-day (mins)',     name: 'halfDayMinutes',     icon: Info },
//                 { label: 'Max punches/day',     name: 'maxPunchesPerDay',   icon: Database },
//               ].map(({ label, name, icon: Icon }) => (
//                 <div key={name} className="flex flex-col gap-1.5">
//                   <div className="flex items-center gap-1.5">
//                     <Icon size={12} className="text-zinc-400 dark:text-zinc-500" />
//                     <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-[family-name:var(--font-outfit)]">
//                       {label}
//                     </label>
//                   </div>
//                   <input
//                     type="number"
//                     name={name}
//                     value={(schedule as any)[name]}
//                     onChange={handleChange}
//                     min={1}
//                     className="w-full bg-zinc-50 dark:bg-zinc-900 px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 border-none outline-none focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-800 transition-all font-[family-name:var(--font-mono)]"
//                   />
//                 </div>
//               ))}
//             </div>
//           </div>
//         </div>

//         {/* Save Button */}
//         <div className="flex justify-end">
//           <button
//             type="button"
//             onClick={handleSave}
//             disabled={saving || hasInvalidWindows()}
//             className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 text-xs font-semibold shadow-xs hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98] min-w-[160px]"
//           >
//             {saving ? (
//               <RefreshCw size={14} className="animate-spin" />
//             ) : (
//               <>
//                 <Save size={14} strokeWidth={2.5} />
//                 <span>Save Schedule</span>
//               </>
//             )}
//           </button>
//         </div>

//       </main>
//     </AppSidebar>
//   );
// }


'use client';
import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { Settings, Clock, Save, Coffee, Sun, Moon, Timer, Info, RefreshCw, AlertTriangle, ToggleLeft, ToggleRight, ShieldCheck } from 'lucide-react';
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

// ─── Constants for Dropdowns ─────────────────────────────────────────────────
const DEBOUNCE_OPTIONS = [
  { label: '1 Minute', value: 1 },
  { label: '2 Minutes', value: 2 },
  { label: '5 Minutes', value: 5 },
  { label: '10 Minutes', value: 10 },
  { label: '15 Minutes', value: 15 },
];

const SHIFT_OPTIONS = [
  { label: '3 Hours (180 mins)', value: 180 },
  { label: '3.5 Hours (210 mins)', value: 210 },
  { label: '4 Hours (240 mins)', value: 240 },
  { label: '4.5 Hours (270 mins)', value: 270 },
  { label: '5 Hours (300 mins)', value: 300 },
];

// ─── Validation Helpers ──────────────────────────────────────────────────────
const toMins = (t: string): number => {
  const [h, m] = t.split(':').map(Number);
  return isNaN(h) || isNaN(m) ? -1 : h * 60 + m;
};

const isValidTime = (t: string): boolean => {
  if (!t || !/^\d{2}:\d{2}$/.test(t)) return false;
  const [h, m] = t.split(':').map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
};

const validateSchedule = (s: Schedule): string | null => {
  const windows = [
    { label: 'Check-In',  start: s.checkInStart,  end: s.checkInEnd },
    { label: 'Check-Out', start: s.checkOutStart, end: s.checkOutEnd },
  ];

  if (s.maxPunchesPerDay === 4) {
    windows.push(
      { label: 'Break-In',  start: s.breakInStart,  end: s.breakInEnd },
      { label: 'Break-Out', start: s.breakOutStart, end: s.breakOutEnd }
    );
  }

  for (const w of windows) {
    if (!isValidTime(w.start)) return `${w.label} Start: invalid format. Use HH:MM`;
    if (!isValidTime(w.end))   return `${w.label} End: invalid format. Use HH:MM`;
    if (toMins(w.end) <= toMins(w.start)) return `${w.label}: End time must be after Start time`;
  }

  return null;
};

interface TimeBlockProps {
  icon: any;
  label: string;
  startName: keyof Schedule;
  endName: keyof Schedule;
  schedule: Schedule;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const TimeBlock = ({ icon: Icon, label, startName, endName, schedule, handleChange }: TimeBlockProps) => {
  const startVal = schedule[startName] as string;
  const endVal   = schedule[endName]   as string;
  const isInvalid = isValidTime(startVal) && isValidTime(endVal) && toMins(endVal) <= toMins(startVal);

  const handleMaskedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    let val = input.value.replace(/[^0-9:]/g, '');
    if (val.length === 2 && !val.includes(':')) val = val + ':';
    if (val.split(':').length > 2) return;
    input.value = val;
    handleChange(e);
  };

  const base = `w-full px-3 py-2 rounded-xl text-xs font-bold border-none outline-none transition-all font-[family-name:var(--font-mono)] tracking-wider text-center focus:ring-2`;
  const normal = `${base} bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 focus:ring-zinc-200 dark:focus:ring-zinc-800`;
  const error  = `${base} bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 focus:ring-red-200 dark:focus:ring-red-900`;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-1.5 flex-wrap">
        <Icon size={14} className="text-zinc-400 dark:text-zinc-500" />
        <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-[family-name:var(--font-outfit)]">
          {label}
        </span>
        {isInvalid && (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-red-500">
            <AlertTriangle size={9} />
            End must be after Start
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1 block">Start</label>
          <input type="text" name={startName} maxLength={5} value={startVal} onChange={handleMaskedChange} placeholder="08:00" className={normal} />
        </div>
        <div>
          <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1 block">End</label>
          <input type="text" name={endName} maxLength={5} value={endVal} onChange={handleMaskedChange} placeholder="17:00" className={isInvalid ? error : normal} />
        </div>
      </div>
    </div>
  );
};

export default function ScheduleSettings() {
  const [schedule, setSchedule] = useState<Schedule>(DEFAULT);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [trackBreaks, setTrackBreaks] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get('/schedule');
        if (res.data.success && res.data.data) {
          setSchedule(res.data.data);
          setTrackBreaks(res.data.data.maxPunchesPerDay === 4);
        }
      } catch {
        toast.error('Failed to load schedule');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setSchedule(p => ({ ...p, [name]: type === 'select-one' || name.endsWith('Minutes') ? Number(value) : value }));
  };

  const handleToggleBreaks = () => {
    const nextToggleState = !trackBreaks;
    setTrackBreaks(nextToggleState);
    setSchedule(p => ({ ...p, maxPunchesPerDay: nextToggleState ? 4 : 2 }));
  };

  const hasInvalidWindows = (): boolean => {
    const windows = [
      { start: schedule.checkInStart,  end: schedule.checkInEnd },
      { start: schedule.checkOutStart, end: schedule.checkOutEnd },
    ];
    if (schedule.maxPunchesPerDay === 4) {
      windows.push(
        { start: schedule.breakInStart,  end: schedule.breakInEnd },
        { start: schedule.breakOutStart, end: schedule.breakOutEnd }
      );
    }
    return windows.some(w => isValidTime(w.start) && isValidTime(w.end) && toMins(w.end) <= toMins(w.start));
  };

  const handleSave = async () => {
    const error = validateSchedule(schedule);
    if (error) {
      toast.error(error);
      return;
    }

    setSaving(true);
    try {
      const res = await apiClient.put('/schedule', schedule);
      if (res.data.success) toast.success('Schedule updated successfully');
      else toast.error(res.data.message || 'Update failed');
    } catch {
      toast.error('An error occurred while saving');
    } finally {
      setSaving(false);
    }
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

        {/* Header */}
        <header className="flex items-start justify-between mb-8">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1">Configuration</p>
            <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">Shift Schedule</h1>
            <p className="mt-1 text-[13px] text-zinc-500 dark:text-zinc-400">Global timing windows and attendance logic.</p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Active</span>
          </div>
        </header>

        {/* Toggle Switch */}
        <div className="bg-zinc-50/50 dark:bg-zinc-900/50 rounded-2xl p-2 shadow-sm mb-6">
          <div className="rounded-xl bg-white dark:bg-zinc-950 p-4 shadow-xs flex items-center justify-between gap-4 border border-zinc-100 dark:border-zinc-900">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-zinc-50 dark:bg-zinc-900 rounded-xl text-zinc-500">
                <Coffee size={16} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Track Lunch & Tea Breaks</h3>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">Enable or disable tracking intermediate out/in break punches.</p>
              </div>
            </div>
            <button type="button" onClick={handleToggleBreaks} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors focus:outline-none">
              {trackBreaks ? <ToggleRight size={34} className="text-zinc-900 dark:text-zinc-100" /> : <ToggleLeft size={34} className="text-zinc-300 dark:text-zinc-700" />}
            </button>
          </div>
        </div>

        {/* Time Windows Matrix */}
        <div className="bg-zinc-50/50 dark:bg-zinc-900/50 rounded-2xl p-2 shadow-sm mb-6">
          <div className="rounded-xl bg-white dark:bg-zinc-950 p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-zinc-100 dark:border-zinc-900">
              <Clock size={15} className="text-zinc-400 dark:text-zinc-500" />
              <span className="font-extrabold text-[14px] text-zinc-800 dark:text-zinc-200">Time Windows Matrix</span>
            </div>
            <div className={`grid grid-cols-1 gap-6 transition-all duration-300 ${trackBreaks ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
              <TimeBlock icon={Sun}    label="Check-In Window"   startName="checkInStart"  endName="checkInEnd"  schedule={schedule} handleChange={handleChange} />
              {trackBreaks && (
                <div className="animate-fadeIn">
                  <TimeBlock icon={Coffee} label="Break Boundaries"  startName="breakInStart"  endName="breakInEnd"  schedule={schedule} handleChange={handleChange} />
                </div>
              )}
              <TimeBlock icon={Moon}   label="Check-Out Window"  startName="checkOutStart" endName="checkOutEnd" schedule={schedule} handleChange={handleChange} />
            </div>
          </div>
        </div>

        {/* Simplified Logic Dropdowns Panel */}
        <div className="bg-zinc-50/50 dark:bg-zinc-900/50 rounded-2xl p-2 shadow-sm mb-6">
          <div className="rounded-xl bg-white dark:bg-zinc-950 p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-zinc-100 dark:border-zinc-900">
              <Settings size={15} className="text-zinc-400 dark:text-zinc-500" />
              <span className="font-extrabold text-[14px] text-zinc-800 dark:text-zinc-200">System Protection Rules</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              {/* Clean Dropdown for Double Tap Interval */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5">
                  <Timer size={12} className="text-zinc-400 dark:text-zinc-500" />
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                    Ignore Duplicate Punches Within
                  </label>
                </div>
                <select
                  name="minIntervalMinutes"
                  value={schedule.minIntervalMinutes}
                  onChange={handleChange as any}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 px-3 py-2.5 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 border-none outline-none focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-800 transition-all appearance-none cursor-pointer"
                >
                  {DEBOUNCE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
                <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 px-1">
                  Protects against accidental duplicate finger scans.
                </span>
              </div>

              {/* Clean Dropdown for Half Day Threshold */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5">
                  <Info size={12} className="text-zinc-400 dark:text-zinc-500" />
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                    Mark Half-Day if Worked Less Than
                  </label>
                </div>
                <select
                  name="halfDayMinutes"
                  value={schedule.halfDayMinutes}
                  onChange={handleChange as any}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 px-3 py-2.5 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 border-none outline-none focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-800 transition-all appearance-none cursor-pointer"
                >
                  {SHIFT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
                <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 px-1">
                  Sets the threshold for minimum daily shift duration.
                </span>
              </div>

            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || hasInvalidWindows()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 text-xs font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98] min-w-[160px]"
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <><Save size={14} strokeWidth={2.5} /><span>Save Schedule</span></>}
          </button>
        </div>

      </main>
    </AppSidebar>
  );
}