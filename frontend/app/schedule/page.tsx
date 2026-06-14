'use client';
import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';
import {
  Settings, Clock, Save, Coffee, Sun, Moon,
  Timer, Info, RefreshCw, AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface Schedule {
  checkInStart: string;  checkInEnd: string;
  breakInStart: string;  breakInEnd: string;
  breakOutStart: string; breakOutEnd: string;
  checkOutStart: string; checkOutEnd: string;
  minIntervalMinutes: number;
  halfDayMinutes: number;
  maxPunchesPerDay: number;
}

const DEFAULT: Schedule = {
  checkInStart: '08:00', checkInEnd: '10:00',
  breakInStart: '12:00', breakInEnd: '13:00',
  breakOutStart: '13:00', breakOutEnd: '14:00',
  checkOutStart: '17:00', checkOutEnd: '19:00',
  minIntervalMinutes: 5, halfDayMinutes: 240, maxPunchesPerDay: 4,
};

const DEBOUNCE_OPTIONS = [
  { label: '1 Minute',   value: 1  },
  { label: '2 Minutes',  value: 2  },
  { label: '5 Minutes',  value: 5  },
  { label: '10 Minutes', value: 10 },
  { label: '15 Minutes', value: 15 },
];

const SHIFT_OPTIONS = [
  { label: '3 Hours (180 mins)',   value: 180 },
  { label: '3.5 Hours (210 mins)', value: 210 },
  { label: '4 Hours (240 mins)',   value: 240 },
  { label: '4.5 Hours (270 mins)', value: 270 },
  { label: '5 Hours (300 mins)',   value: 300 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const toMins = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return isNaN(h) || isNaN(m) ? -1 : h * 60 + m;
};

const isValidTime = (t: string) => {
  if (!t || !/^\d{2}:\d{2}$/.test(t)) return false;
  const [h, m] = t.split(':').map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
};

const validateSchedule = (s: Schedule, trackBreaks: boolean): string | null => {
  const windows = [
    { label: 'Check-In',  start: s.checkInStart,  end: s.checkInEnd },
    { label: 'Check-Out', start: s.checkOutStart, end: s.checkOutEnd },
  ];
  if (trackBreaks) {
    windows.push(
      { label: 'Break-In',  start: s.breakInStart,  end: s.breakInEnd },
      { label: 'Break-Out', start: s.breakOutStart, end: s.breakOutEnd },
    );
  }
  for (const w of windows) {
    if (!isValidTime(w.start)) return `${w.label} Start: invalid format. Use HH:MM`;
    if (!isValidTime(w.end))   return `${w.label} End: invalid format. Use HH:MM`;
    if (toMins(w.end) <= toMins(w.start)) return `${w.label}: End time must be after Start time`;
  }
  return null;
};

// ─── TimeBlock ────────────────────────────────────────────────────────────────
interface TimeBlockProps {
  icon: React.ElementType;
  label: string;
  startName: keyof Schedule;
  endName: keyof Schedule;
  schedule: Schedule;
  onChange: (name: keyof Schedule, value: string) => void;
}

function TimeBlock({ icon: Icon, label, startName, endName, schedule, onChange }: TimeBlockProps) {
  const startVal  = schedule[startName] as string;
  const endVal    = schedule[endName]   as string;
  const isInvalid = isValidTime(startVal) && isValidTime(endVal) && toMins(endVal) <= toMins(startVal);

  const handleMasked = (name: keyof Schedule, raw: string) => {
    let val = raw.replace(/[^0-9:]/g, '');
    if (val.length === 2 && !val.includes(':')) val = val + ':';
    if (val.split(':').length > 2) return;
    onChange(name, val);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {isInvalid && (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-destructive">
            <AlertTriangle className="h-3 w-3" /> End must be after Start
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Start</Label>
          <Input
            value={startVal}
            maxLength={5}
            placeholder="08:00"
            onChange={e => handleMasked(startName, e.target.value)}
            className="text-center font-mono text-sm tracking-widest"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">End</Label>
          <Input
            value={endVal}
            maxLength={5}
            placeholder="17:00"
            onChange={e => handleMasked(endName, e.target.value)}
            className={`text-center font-mono text-sm tracking-widest ${
              isInvalid ? 'border-destructive focus-visible:ring-destructive text-destructive' : ''
            }`}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ScheduleSettings() {
  const [schedule,    setSchedule]    = useState<Schedule>(DEFAULT);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [trackBreaks, setTrackBreaks] = useState(true);

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

  const handleTimeChange = (name: keyof Schedule, value: string) => {
    setSchedule(p => ({ ...p, [name]: value }));
  };

  const handleSelectChange = (name: keyof Schedule, value: string) => {
    setSchedule(p => ({ ...p, [name]: Number(value) }));
  };

  const handleToggleBreaks = (checked: boolean) => {
    setTrackBreaks(checked);
    setSchedule(p => ({ ...p, maxPunchesPerDay: checked ? 4 : 2 }));
  };

  const hasInvalidWindows = () => {
    const windows = [
      { start: schedule.checkInStart,  end: schedule.checkInEnd },
      { start: schedule.checkOutStart, end: schedule.checkOutEnd },
    ];
    if (trackBreaks) {
      windows.push(
        { start: schedule.breakInStart,  end: schedule.breakInEnd },
        { start: schedule.breakOutStart, end: schedule.breakOutEnd },
      );
    }
    return windows.some(w => isValidTime(w.start) && isValidTime(w.end) && toMins(w.end) <= toMins(w.start));
  };

  const handleSave = async () => {
    const error = validateSchedule(schedule, trackBreaks);
    if (error) { toast.error(error); return; }
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
    <div className="flex items-center justify-center h-[60vh]">
      <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <main className="px-6 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
            Configuration
          </p>
          <h1 className="text-2xl font-bold tracking-tight">Shift Schedule</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Global timing windows and attendance logic.
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-1.5 text-emerald-600 border-emerald-200 bg-emerald-50">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Active
        </Badge>
      </div>

      {/* Break Tracking Toggle */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Coffee className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold">Track Lunch & Tea Breaks</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Enable or disable tracking intermediate break punches.
                </p>
              </div>
            </div>
            <Switch checked={trackBreaks} onCheckedChange={handleToggleBreaks} />
          </div>
        </CardContent>
      </Card>

      {/* Time Windows */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Time Windows
          </CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="pt-5">
          <div className={`grid grid-cols-1 gap-6 ${trackBreaks ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
            <TimeBlock
              icon={Sun}
              label="Check-In Window"
              startName="checkInStart"
              endName="checkInEnd"
              schedule={schedule}
              onChange={handleTimeChange}
            />
            {trackBreaks && (
              <TimeBlock
                icon={Coffee}
                label="Break Boundaries"
                startName="breakInStart"
                endName="breakInEnd"
                schedule={schedule}
                onChange={handleTimeChange}
              />
            )}
            <TimeBlock
              icon={Moon}
              label="Check-Out Window"
              startName="checkOutStart"
              endName="checkOutEnd"
              schedule={schedule}
              onChange={handleTimeChange}
            />
          </div>
        </CardContent>
      </Card>

      {/* System Protection Rules */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Settings className="h-4 w-4 text-muted-foreground" />
            System Protection Rules
          </CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="pt-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Timer className="h-3.5 w-3.5 text-muted-foreground" />
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Ignore Duplicate Punches Within
                </Label>
              </div>
              <Select
                value={String(schedule.minIntervalMinutes)}
                onValueChange={v => handleSelectChange('minIntervalMinutes', v)}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEBOUNCE_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Protects against accidental duplicate finger scans.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-muted-foreground" />
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Mark Half-Day if Worked Less Than
                </Label>
              </div>
              <Select
                value={String(schedule.halfDayMinutes)}
                onValueChange={v => handleSelectChange('halfDayMinutes', v)}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SHIFT_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Sets the threshold for minimum daily shift duration.
              </p>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving || hasInvalidWindows()}
          className="min-w-36"
        >
          {saving
            ? <RefreshCw className="h-4 w-4 animate-spin" />
            : <><Save className="h-4 w-4 mr-2" /> Save Schedule</>
          }
        </Button>
      </div>

    </main>
  );
}