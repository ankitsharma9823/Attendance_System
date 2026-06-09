'use client';

import { useEffect, useState } from 'react';
import { AppSidebar } from '@/components/shared/AppSidebar';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';
import {
  RefreshCw, Edit3, ShieldX, Trash2, Check, X,
  UserPlus, ShieldAlert, ChevronLeft, ChevronRight,
  Cpu, Users,
} from 'lucide-react';
import { getErrorMessage } from '@/lib/get-error-message';
import { DataTable, Column } from '@/components/ui/DataTable';
import AddMachineUserForm from './add/page';
import { AdminRegisterForm } from '@/components/auth/AdminRegisterForm';

interface MachineUser {
  uid: number;
  userId: string;
  name: string;
  role: number;
}

interface AppUser {
  id: number;
  username: string;
  email: string;
  role: 'user' | 'admin';
}

interface PaginationMeta {
  page: number;
  totalPages: number;
}

type TabKey = 'machine' | 'app';

export default function MachineUsersPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('machine');

  const [machineUsers, setMachineUsers] = useState<MachineUser[]>([]);
  const [machineMeta, setMachineMeta] = useState<PaginationMeta>({ page: 1, totalPages: 1 });
  const [machineLoading, setMachineLoading] = useState(true);
  const [editingMachine, setEditingMachine] = useState<MachineUser | null>(null);
  const [machineNewName, setMachineNewName] = useState('');
  const [machineNewRole, setMachineNewRole] = useState(0);

  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [appMeta, setAppMeta] = useState<PaginationMeta>({ page: 1, totalPages: 1 });
  const [appLoading, setAppLoading] = useState(false);
  const [editingApp, setEditingApp] = useState<AppUser | null>(null);
  const [appNewUsername, setAppNewUsername] = useState('');
  const [appNewRole, setAppNewRole] = useState<'user' | 'admin'>('user');

  const [isMachineUserModalOpen, setIsMachineUserModalOpen] = useState(false);
  const [isAppUserModalOpen, setIsAppUserModalOpen] = useState(false);

  const fetchMachineUsers = async (page: number = 1) => {
    setMachineLoading(true);
    try {
      const res = await apiClient.get(`/device/users?page=${page}&limit=10`);
      if (res.data.success) {
        setMachineUsers(res.data.data);
        setMachineMeta({ page: res.data.meta.page, totalPages: res.data.meta.totalPages });
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to fetch machine users'));
    } finally {
      setMachineLoading(false);
    }
  };

  const fetchAppUsers = async (page: number = 1) => {
    setAppLoading(true);
    try {
      const res = await apiClient.get(`/auth/user?page=${page}&limit=10`);
      setAppUsers(res.data.users ?? []);
      setAppMeta({
        page: res.data.meta?.page ?? 1,
        totalPages: res.data.meta?.totalPages ?? 1,
      });
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to fetch app users'));
    } finally {
      setAppLoading(false);
    }
  };

  useEffect(() => { fetchMachineUsers(1); }, []);

  useEffect(() => {
    if (activeTab === 'app' && appUsers.length === 0) fetchAppUsers(1);
  }, [activeTab]);

  const handleMachineDelete = async (user: MachineUser) => {
    if (!window.confirm(`Delete ${user.name} from machine?`)) return;
    try {
      const res = await apiClient.delete(`/device/users/${user.userId}?uid=${user.uid}`);
      if (res.data.success) { toast.success(res.data.message); fetchMachineUsers(machineMeta.page); }
    } catch (err) { toast.error(getErrorMessage(err, 'Delete failed')); }
  };

  const handleClearFP = async (user: MachineUser) => {
    if (!window.confirm(`Clear all fingerprints for ${user.name}?`)) return;
    try {
      const res = await apiClient.post(`/device/users/${user.userId}/clear-fp`, { uid: user.uid });
      if (res.data.success) toast.success(res.data.message);
    } catch (err) { toast.error(getErrorMessage(err, 'Clear FP failed')); }
  };

  const saveMachineEdit = async () => {
    if (!editingMachine || !machineNewName.trim()) return;
    try {
      const res = await apiClient.patch(`/device/users/${editingMachine.userId}`, {
        uid: editingMachine.uid, name: machineNewName.trim(), role: machineNewRole,
      });
      if (res.data.success) {
        toast.success(res.data.message);
        setEditingMachine(null);
        fetchMachineUsers(machineMeta.page);
      }
    } catch (err) { toast.error(getErrorMessage(err, 'Update failed')); }
  };

  const saveAppEdit = async () => {
    if (!editingApp || !appNewUsername.trim()) return;
    try {
      const res = await apiClient.put(`/auth/user`, {
        username: appNewUsername.trim(),
        role: appNewRole,
      });
      if (res.data.msg) {
        toast.success(res.data.msg);
        setEditingApp(null);
        fetchAppUsers(appMeta.page);
      }
    } catch (err) { toast.error(getErrorMessage(err, 'Update failed')); }
  };

  const handleAppDelete = async (user: AppUser) => {
    if (!window.confirm(`Delete ${user.username}?`)) return;
    try {
      const res = await apiClient.delete(`/auth/user/${user.id}`);
      if (res.data.success) {
        toast.success(res.data.message);
        fetchAppUsers(appMeta.page);
      }
    } catch (err) { toast.error(getErrorMessage(err, 'Delete failed')); }
  };

  const machineColumns: Column<MachineUser>[] = [
    {
      header: 'UID',
      accessor: 'uid',
      mono: true,
      className: 'text-zinc-400 dark:text-zinc-500 font-bold text-xs',
    },
    { header: 'User ID', accessor: 'userId', mono: true },
    {
      header: 'Name',
      accessor: (user: MachineUser) =>
        editingMachine?.userId === user.userId ? (
          <div className="flex flex-col gap-2 py-1 max-w-60">
            <input
              value={machineNewName}
              onChange={e => setMachineNewName(e.target.value)}
              className="bg-zinc-50 dark:bg-zinc-900 px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 border-none outline-none focus:ring-2"
            />
            <select
              value={machineNewRole}
              onChange={e => setMachineNewRole(Number(e.target.value))}
              className="bg-zinc-50 dark:bg-zinc-900 px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 border-none outline-none cursor-pointer"
            >
              <option value={0}>Standard User</option>
              <option value={14}>Machine Admin</option>
            </select>
            <div className="flex gap-1.5 mt-0.5">
              <button onClick={saveMachineEdit} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 text-[11px] font-bold">
                <Check size={11} /> Save
              </button>
              <button onClick={() => setEditingMachine(null)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-zinc-500 text-[11px] font-bold">
                <X size={11} /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">{user.name}</span>
        ),
    },
    {
      header: 'Role',
      accessor: (user: MachineUser) => (
        <span className={`px-2 py-1 rounded-md text-[11px] font-bold uppercase ${user.role === 14 ? 'bg-purple-50 text-purple-600 dark:bg-purple-950/30' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800'}`}>
          {user.role === 14 ? 'Admin' : 'User'}
        </span>
      ),
    },
    {
      header: 'Actions',
      align: 'right',
      accessor: (user: MachineUser) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => { setEditingMachine(user); setMachineNewName(user.name); setMachineNewRole(user.role); }}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            <Edit3 size={13} />
          </button>
          <button onClick={() => handleClearFP(user)} className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-600">
            <ShieldX size={13} />
          </button>
          <button onClick={() => handleMachineDelete(user)} className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600">
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  const appColumns: Column<AppUser>[] = [
    {
      header: 'ID',
      accessor: 'id',
      mono: true,
      className: 'text-zinc-400 dark:text-zinc-500 font-bold text-xs',
    },
    {
      header: 'Username',
      accessor: (user: AppUser) =>
        editingApp?.id === user.id ? (
          <div className="flex flex-col gap-2 py-1 max-w-60">
            <input
              value={appNewUsername}
              onChange={e => setAppNewUsername(e.target.value)}
              className="bg-zinc-50 dark:bg-zinc-900 px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 border-none outline-none focus:ring-2"
            />
            <select
              value={appNewRole}
              onChange={e => setAppNewRole(e.target.value as 'user' | 'admin')}
              className="bg-zinc-50 dark:bg-zinc-900 px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 border-none outline-none cursor-pointer"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
            <div className="flex gap-1.5 mt-0.5">
              <button onClick={saveAppEdit} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 text-[11px] font-bold">
                <Check size={11} /> Save
              </button>
              <button onClick={() => setEditingApp(null)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-zinc-500 text-[11px] font-bold">
                <X size={11} /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">{user.username}</span>
        ),
    },
    {
      header: 'Email',
      accessor: 'email',
      mono: true,
      className: 'text-zinc-500 text-xs',
    },
    {
      header: 'Role',
      accessor: (user: AppUser) => (
        <span className={`px-2 py-1 rounded-md text-[11px] font-bold uppercase ${user.role === 'admin' ? 'bg-purple-50 text-purple-600 dark:bg-purple-950/30' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800'}`}>
          {user.role}
        </span>
      ),
    },
    {
      header: 'Actions',
      align: 'right',
      accessor: (user: AppUser) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => { setEditingApp(user); setAppNewUsername(user.username); setAppNewRole(user.role); }}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            <Edit3 size={13} />
          </button>
          <button
            onClick={() => handleAppDelete(user)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  const isMachine = activeTab === 'machine';
  const loading = isMachine ? machineLoading : appLoading;
  const meta = isMachine ? machineMeta : appMeta;
  const fetchPage = (page: number) => isMachine ? fetchMachineUsers(page) : fetchAppUsers(page);

  return (
    <div className="overflow-x-hidden h-screen">
      <AppSidebar>
        <main className="w-full max-w-6xl mx-auto px-6 py-8 font-outfit relative">

          <header className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1">
                Hardware
              </p>
              <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">
                Users
              </h1>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                onClick={() => fetchPage(meta.page)}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 bg-white dark:bg-zinc-950 border dark:border-zinc-800"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
              </button>
              <button
                onClick={() => setIsAppUserModalOpen(true)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              >
                <ShieldAlert size={13} className="inline mr-1" /> Add App User
              </button>
              <button
                onClick={() => setIsMachineUserModalOpen(true)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-950"
              >
                <UserPlus size={13} className="inline mr-1" /> Add Machine User
              </button>
            </div>
          </header>

          <div className="flex gap-1 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl w-fit mb-6">
            <button
              onClick={() => setActiveTab('machine')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'machine'
                  ? 'bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 shadow-sm'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              <Cpu size={13} />
              Machine Users
              {machineUsers.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-zinc-200 dark:bg-zinc-800 text-zinc-500">
                  {machineUsers.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('app')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'app'
                  ? 'bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 shadow-sm'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              <Users size={13} />
              App Users
              {appUsers.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-zinc-200 dark:bg-zinc-800 text-zinc-500">
                  {appUsers.length}
                </span>
              )}
            </button>
          </div>

          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-2xl overflow-hidden shadow-xs">
            {isMachine ? (
              <DataTable
                columns={machineColumns}
                data={machineUsers}
                loading={machineLoading}
                rowId={u => u.userId}
                emptyMessage="No hardware users detected."
              />
            ) : (
              <DataTable
                columns={appColumns}
                data={appUsers}
                loading={appLoading}
                rowId={u => u.id}
                emptyMessage="No app users found."
              />
            )}
          </div>

          <div className="flex items-center justify-between mt-6 px-2">
            <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">
              Page {meta.page} of {meta.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={meta.page <= 1}
                onClick={() => fetchPage(meta.page - 1)}
                className="p-2 rounded-lg border dark:border-zinc-800 disabled:opacity-50"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                disabled={meta.page >= meta.totalPages}
                onClick={() => fetchPage(meta.page + 1)}
                className="p-2 rounded-lg border dark:border-zinc-800 disabled:opacity-50"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {isMachineUserModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
              <div className="bg-white dark:bg-zinc-950 rounded-2xl p-6 shadow-2xl w-full max-w-[440px] relative max-h-[90vh] overflow-y-auto">
                <button onClick={() => setIsMachineUserModalOpen(false)} className="absolute top-4 right-4 text-zinc-400">
                  <X size={16} />
                </button>
                <div className="pt-2">
                  <AddMachineUserForm onSuccess={() => { setIsMachineUserModalOpen(false); fetchMachineUsers(1); }} />
                </div>
              </div>
            </div>
          )}

          {isAppUserModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
              <div className="bg-white dark:bg-zinc-950 rounded-2xl p-6 shadow-2xl w-full max-w-xl relative max-h-[90vh] overflow-y-auto">
                <button onClick={() => setIsAppUserModalOpen(false)} className="absolute top-4 right-4 text-zinc-400">
                  <X size={16} />
                </button>
                <div className="pt-2">
                  <AdminRegisterForm onSuccess={() => { setIsAppUserModalOpen(false); fetchAppUsers(1); }} />
                </div>
              </div>
            </div>
          )}

        </main>
      </AppSidebar>
    </div>
  );
}