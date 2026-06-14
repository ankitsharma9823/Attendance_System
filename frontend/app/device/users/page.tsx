'use client';

import { useEffect, useState } from 'react';
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

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

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
    try {
      const res = await apiClient.delete(`/device/users/${user.userId}?uid=${user.uid}`);
      if (res.data.success) { toast.success(res.data.message); fetchMachineUsers(machineMeta.page); }
    } catch (err) { toast.error(getErrorMessage(err, 'Delete failed')); }
  };

  const handleClearFP = async (user: MachineUser) => {
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
      const res = await apiClient.put(`/auth/user/${editingApp.id}`, {
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
    try {
      const res = await apiClient.delete(`/auth/user/${user.id}`);
      toast.success(res.data.message ?? res.data.msg ?? 'User deleted');
      fetchAppUsers(appMeta.page);
    } catch (err) { toast.error(getErrorMessage(err, 'Delete failed')); }
  };

  const machineColumns: Column<MachineUser>[] = [
    {
      header: 'UID',
      accessor: 'uid',
      mono: true,
      className: 'text-muted-foreground font-bold text-xs',
    },
    { header: 'User ID', accessor: 'userId', mono: true },
    {
      header: 'Name',
      accessor: (user: MachineUser) =>
        editingMachine?.userId === user.userId ? (
          <div className="flex flex-col gap-2 py-1 max-w-60">
            <Input
              value={machineNewName}
              onChange={e => setMachineNewName(e.target.value)}
              className="h-8 text-xs"
            />
            <Select
              value={String(machineNewRole)}
              onValueChange={val => setMachineNewRole(Number(val))}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Standard User</SelectItem>
                <SelectItem value="14">Machine Admin</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-1.5">
              <Button size="sm" className="h-7 text-[11px] px-3" onClick={saveMachineEdit}>
                <Check size={11} className="mr-1" /> Save
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-[11px] px-3" onClick={() => setEditingMachine(null)}>
                <X size={11} className="mr-1" /> Cancel
              </Button>
            </div>
          </div>
        ) : (
          <span className="font-semibold">{user.name}</span>
        ),
    },
    {
      header: 'Role',
      accessor: (user: MachineUser) => (
        <Badge variant={user.role === 14 ? 'default' : 'secondary'} className="uppercase text-[10px] font-bold">
          {user.role === 14 ? 'Admin' : 'User'}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      align: 'right',
      accessor: (user: MachineUser) => (
        <TooltipProvider delayDuration={200}>
          <div className="flex items-center justify-end gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => { setEditingMachine(user); setMachineNewName(user.name); setMachineNewRole(user.role); }}
                >
                  <Edit3 size={13} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit user</TooltipContent>
            </Tooltip>

            <AlertDialog>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-amber-600">
                      <ShieldX size={13} />
                    </Button>
                  </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent>Clear fingerprints</TooltipContent>
              </Tooltip>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear fingerprints?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove all biometric data for <strong>{user.name}</strong>. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleClearFP(user)} className="bg-amber-600 hover:bg-amber-700">
                    Clear fingerprints
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                      <Trash2 size={13} />
                    </Button>
                  </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent>Delete user</TooltipContent>
              </Tooltip>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete machine user?</AlertDialogTitle>
                  <AlertDialogDescription>
                    <strong>{user.name}</strong> will be permanently removed from the device. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleMachineDelete(user)} className="bg-destructive hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </TooltipProvider>
      ),
    },
  ];

  const appColumns: Column<AppUser>[] = [
    {
      header: 'ID',
      accessor: 'id',
      mono: true,
      className: 'text-muted-foreground font-bold text-xs',
    },
    {
      header: 'Username',
      accessor: (user: AppUser) =>
        editingApp?.id === user.id ? (
          <div className="flex flex-col gap-2 py-1 max-w-60">
            <Input
              value={appNewUsername}
              onChange={e => setAppNewUsername(e.target.value)}
              className="h-8 text-xs"
            />
            <Select
              value={appNewRole}
              onValueChange={val => setAppNewRole(val as 'user' | 'admin')}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-1.5">
              <Button size="sm" className="h-7 text-[11px] px-3" onClick={saveAppEdit}>
                <Check size={11} className="mr-1" /> Save
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-[11px] px-3" onClick={() => setEditingApp(null)}>
                <X size={11} className="mr-1" /> Cancel
              </Button>
            </div>
          </div>
        ) : (
          <span className="font-semibold">{user.username}</span>
        ),
    },
    {
      header: 'Email',
      accessor: 'email',
      mono: true,
      className: 'text-muted-foreground text-xs',
    },
    {
      header: 'Role',
      accessor: (user: AppUser) => (
        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="uppercase text-[10px] font-bold">
          {user.role}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      align: 'right',
      accessor: (user: AppUser) => (
        <TooltipProvider delayDuration={200}>
          <div className="flex items-center justify-end gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => { setEditingApp(user); setAppNewUsername(user.username); setAppNewRole(user.role); }}
                >
                  <Edit3 size={13} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit user</TooltipContent>
            </Tooltip>

            <AlertDialog>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                      <Trash2 size={13} />
                    </Button>
                  </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent>Delete user</TooltipContent>
              </Tooltip>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete app user?</AlertDialogTitle>
                  <AlertDialogDescription>
                    <strong>{user.username}</strong> will be permanently removed. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleAppDelete(user)} className="bg-destructive hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </TooltipProvider>
      ),
    },
  ];

  const isMachine = activeTab === 'machine';
  const loading = isMachine ? machineLoading : appLoading;
  const meta = isMachine ? machineMeta : appMeta;
  const fetchPage = (page: number) => isMachine ? fetchMachineUsers(page) : fetchAppUsers(page);

  return (
    <main className="w-full mx-auto px-6 py-8 font-outfit relative">

      <header className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
            Hardware
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight">Users</h1>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchPage(meta.page)}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsAppUserModalOpen(true)}
            className="gap-1.5"
          >
            <ShieldAlert size={13} />
            Add App User
          </Button>

          <Button
            size="sm"
            onClick={() => setIsMachineUserModalOpen(true)}
            className="gap-1.5"
          >
            <UserPlus size={13} />
            Add Machine User
          </Button>
        </div>
      </header>

      <Tabs
        value={activeTab}
        onValueChange={val => setActiveTab(val as TabKey)}
        className="mb-6"
      >
        <TabsList>
          <TabsTrigger value="machine" className="gap-2">
            <Cpu size={13} />
            Machine Users
            {machineUsers.length > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-bold">
                {machineUsers.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="app" className="gap-2">
            <Users size={13} />
            App Users
            {appUsers.length > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-bold">
                {appUsers.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
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

      <div className="flex items-center justify-between mt-4 px-1">
        <span className="text-xs text-muted-foreground font-medium">
          Page {meta.page} of {meta.totalPages}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={meta.page <= 1}
            onClick={() => fetchPage(meta.page - 1)}
          >
            <ChevronLeft size={14} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={meta.page >= meta.totalPages}
            onClick={() => fetchPage(meta.page + 1)}
          >
            <ChevronRight size={14} />
          </Button>
        </div>
      </div>

      <Dialog open={isMachineUserModalOpen} onOpenChange={setIsMachineUserModalOpen}>
        <DialogContent className="max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="sr-only">Add Machine User</DialogTitle>
          </DialogHeader>
          <AddMachineUserForm
            onSuccess={() => {
              setIsMachineUserModalOpen(false);
              fetchMachineUsers(1);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isAppUserModalOpen} onOpenChange={setIsAppUserModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="sr-only">Add App User</DialogTitle>
          </DialogHeader>
          <AdminRegisterForm
            onSuccess={() => {
              setIsAppUserModalOpen(false);
              fetchAppUsers(1);
            }}
          />
        </DialogContent>
      </Dialog>

    </main>
  );
}