'use client';
import { useState } from 'react';
import { attendanceService } from '@/services/attendance-service';
import { toast } from 'sonner';

export const SyncButton = ({ onComplete }: { onComplete: () => void }) => {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await attendanceService.triggerSync();
      if (res.success) {
        toast.success(res.message, { description: 'Device sync complete' });
        onComplete();
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Device unreachable or timeout.';
      toast.error('Sync failed', { description: message });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <button onClick={handleSync} disabled={isSyncing} className="btn-secondary">
      <svg className={isSyncing ? 'spin' : ''} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      {isSyncing ? 'Syncing…' : 'Sync Device'}
    </button>
  );
};