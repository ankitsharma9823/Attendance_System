'use client';
import { useEffect, useState } from 'react';
import { AppSidebar } from '@/components/shared/AppSidebar';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { RefreshCw, Edit3, ShieldX, Trash2, Check, X, Download, Upload } from 'lucide-react';
import { getErrorMessage } from '@/lib/get-error-message';
import { DataTable, Column } from '@/components/ui/DataTable';
import { deviceService } from '@/services/device-service';

interface MachineUser { uid: number; userId: string; name: string; role: number; }

export default function MachineUsersPage() {
  const [users, setUsers] = useState<MachineUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<MachineUser | null>(null);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/device/users');
      if (res.data.success) setUsers(res.data.data);
    } catch (err) { toast.error(getErrorMessage(err, 'Failed to fetch users')); }
    finally { setLoading(false); }
  };

  const handleSyncEmployees = async () => {
    setActionLoading(true);
    try {
      const res = await deviceService.syncEmployees();
      if (res.success) {
        toast.success(res.message || 'Imported device users into the database.');
        fetchUsers();
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to import users from device'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestoreUsers = async () => {
    if (!window.confirm('Restore active users from database to the machine? This may overwrite device registry entries.')) return;
    setActionLoading(true);
    try {
      const res = await deviceService.restoreUsersFromDb();
      if (res.success) {
        toast.success(res.message || 'Restored users to device from database.');
        fetchUsers();
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to restore users to device'));
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleDelete = async (user: MachineUser) => {
    if (!window.confirm(`Delete ${user.name} from machine?`)) return;
    try {
      const res = await apiClient.delete(`/device/users/${user.userId}?uid=${user.uid}`);
      if (res.data.success) { toast.success(res.data.message); setUsers(u => u.filter(x => x.userId !== user.userId)); }
    } catch (err) { toast.error(getErrorMessage(err, 'Delete failed')); }
  };

  const handleClearFP = async (user: MachineUser) => {
    if (!window.confirm(`Clear all fingerprints for ${user.name}?`)) return;
    try {
      const res = await apiClient.post(`/device/users/${user.userId}/clear-fp`, { uid: user.uid });
      if (res.data.success) toast.success(res.data.message);
    } catch (err) { toast.error(getErrorMessage(err, 'Clear FP failed')); }
  };

  const saveEdit = async () => {
    if (!editingUser || !newName.trim()) return;
    try {
      const res = await apiClient.patch(`/device/users/${editingUser.userId}`, { uid: editingUser.uid, name: newName.trim(), role: newRole });
      if (res.data.success) {
        toast.success(res.data.message);
        setUsers(u => u.map(x => x.userId === editingUser.userId ? { ...x, name: newName.trim(), role: newRole } : x));
        setEditingUser(null);
      }
    } catch (err) { toast.error(getErrorMessage(err, 'Update failed')); }
  };

  const columns: Column<MachineUser>[] = [
    { 
      header: 'UID', 
      accessor: 'uid', 
      mono: true, 
      className: 'text-zinc-400 dark:text-zinc-500 font-bold text-xs' 
    },
    { 
      header: 'User ID', 
      accessor: 'userId', 
      mono: true 
    },
    {
      header: 'Name',
      accessor: user => editingUser?.userId === user.userId ? (
        <div className="flex flex-col gap-2 py-1 max-w-60">
          <input 
            value={newName} 
            onChange={e => setNewName(e.target.value)} 
            className="bg-zinc-50 dark:bg-zinc-900 px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 border-none outline-none focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-800 transition-all" 
          />
          <select 
            value={newRole} 
            onChange={e => setNewRole(Number(e.target.value))} 
            className="bg-zinc-50 dark:bg-zinc-900 px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 border-none outline-none appearance-none cursor-pointer"
          >
            <option value={0}>Standard User</option>
            <option value={14}>Machine Admin</option>
          </select>
          <div className="flex gap-1.5 mt-0.5">
            <button 
              onClick={saveEdit} 
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 text-[11px] font-bold shadow-xs hover:opacity-90 transition-all active:scale-95"
            >
              <Check size={11} strokeWidth={2.5} /> Save
            </button>
            <button 
              onClick={() => setEditingUser(null)} 
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-[11px] font-bold transition-all active:scale-95"
            >
              <X size={11} strokeWidth={2.5} /> Cancel
            </button>
          </div>
        </div>
      ) : <span className="font-semibold text-zinc-800 dark:text-zinc-200">{user.name}</span>,
    },
    {
      header: 'Role',
      accessor: user => {
        const isAdmin = user.role === 14;
        return (
          <span className={`px-2 py-1 rounded-md text-[11px] font-bold tracking-wide uppercase font-outfit ${
            isAdmin 
              ? 'bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400' 
              : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
          }`}>
            {isAdmin ? 'Admin' : 'User'}
          </span>
        );
      },
    },
    {
      header: 'Actions', align: 'right',
      accessor: user => (
        <div className="flex items-center justify-end gap-1">
          <button 
            onClick={() => { setEditingUser(user); setNewName(user.name); setNewRole(user.role); }}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all active:scale-95" 
            title="Edit"
          >
            <Edit3 size={13} />
          </button>
          <button 
            onClick={() => handleClearFP(user)} 
            className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-600 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-all active:scale-95" 
            title="Clear fingerprints"
          >
            <ShieldX size={13} />
          </button>
          <button 
            onClick={() => handleDelete(user)} 
            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 transition-all active:scale-95" 
            title="Delete"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <AppSidebar>
      <main className="max-w-300 mx-auto px-4 py-8 md:px-8 font-outfit">
        
        {/* Modern Header Grid Row */}
        <header className="flex flex-col gap-4 mb-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1">Hardware</p>
            <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">Machine Users</h1>
            <p className="mt-1 text-[13px] text-zinc-500 dark:text-zinc-400">Manage users registered on the biometric device.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              onClick={fetchUsers}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900 shadow-xs border-none transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={13} strokeWidth={2.5} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            <button
              onClick={handleSyncEmployees}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200 shadow-xs border-none transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Upload size={13} />
              <span>Import users from device</span>
            </button>
            <button
              onClick={handleRestoreUsers}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900 shadow-xs border-none transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Download size={13} />
              <span>Restore users to device</span>
            </button>
          </div>
        </header>

        {/* Modular Layout Table Mount */}
        <DataTable 
          columns={columns} 
          data={users} 
          loading={loading} 
          rowId={u => u.userId}
          emptyMessage="No hardware users detected." 
        />
      </main>
    </AppSidebar>
  );
}