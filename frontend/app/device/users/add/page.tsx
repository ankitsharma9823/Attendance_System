// 'use client';

// import { useState } from 'react';
// import { useForm } from 'react-hook-form';
// import { AppSidebar } from '@/components/shared/AppSidebar';
// import { apiClient } from '@/lib/api';
// import { toast } from 'sonner';
// import { UserPlus, Loader2, Users } from 'lucide-react';
// import { getErrorMessage } from '@/lib/get-error-message';

// interface UserFormInputs {
//   name: string;
//   role: string;
// }

// export default function AddMachineUserPage() {
//   const [loading, setLoading] = useState(false);
  
//   const {
//     register,
//     handleSubmit,
//     reset,
//     formState: { errors },
//   } = useForm<UserFormInputs>({
//     defaultValues: { name: '', role: '0' }
//   });

//   const onSubmit = async (data: UserFormInputs) => {
//     setLoading(true);
//     try {
//       const res = await apiClient.post('/device/users', {
//         name: data.name.trim(),
//         role: parseInt(data.role, 10),
//       });

//       if (res.data.success) {
//         const generatedId = res.data.employeeId ? ` (ID: ${res.data.employeeId})` : '';
//         toast.success((res.data.message || 'User added') + generatedId);
//         reset();
//       } else {
//         toast.error(res.data.message || 'Failed to add user');
//       }
//     } catch (error: any) {
//       toast.error(getErrorMessage(error, 'Failed to add user'));
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <AppSidebar>
//       <main className="max-w-[400px] mx-auto px-4 py-12 w-full">
        
//         {/* Header Section */}
//         <header className="mb-8">
//           <div className="flex items-center gap-4 p-1">
//             <div className="bg-white p-3 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-zinc-100 text-zinc-900">
//               <Users size={20} />
//             </div>
//             <div>
//               <h1 className="text-[14px] font-bold text-zinc-900">Register Operator</h1>
//               <p className="text-[11px] font-medium text-zinc-500">Provision new biometric identity</p>
//             </div>
//           </div>
//         </header>

//         {/* Main Form Container - "Shadow White" Style */}
//         <div className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-zinc-100">
//           <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            
//             <div className="flex flex-col gap-1.5">
//               <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-1">
//                 Full Name
//               </label>
//               <input
//                 {...register('name', { required: 'Name is required' })}
//                 type="text"
//                 placeholder="e.g. Anil Sharma"
//                 className={`w-full px-4 py-3 bg-zinc-50/50 text-[13px] font-medium text-zinc-900 rounded-xl border border-zinc-200 transition-all duration-200 outline-none
//                   ${errors.name 
//                     ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/5' 
//                     : 'focus:bg-white focus:border-zinc-300 focus:ring-4 focus:ring-zinc-900/5'
//                   }`}
//               />
//               {errors.name && <p className="text-[11px] font-medium text-red-500 px-1">{errors.name.message}</p>}
//             </div>

//             <div className="flex flex-col gap-1.5">
//               <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-1">
//                 Device Role
//               </label>
//               <select
//                 {...register('role')}
//                 className="w-full px-4 py-3 bg-zinc-50/50 text-[13px] font-medium text-zinc-900 rounded-xl border border-zinc-200 focus:bg-white focus:border-zinc-300 focus:ring-4 focus:ring-zinc-900/5 transition-all outline-none appearance-none"
//               >
//                 <option value="0">Normal User</option>
//                 <option value="14">Admin (Super User)</option>
//               </select>
//             </div>

//             <button
//               type="submit"
//               disabled={loading}
//               className="w-full justify-center bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl py-3 text-xs font-semibold flex items-center gap-2 shadow-lg shadow-zinc-900/20 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 mt-2"
//             >
//               {loading ? (
//                 <><Loader2 size={14} className="animate-spin" /> Processing...</>
//               ) : (
//                 <><UserPlus size={14} /> Add to Machine</>
//               )}
//             </button>
//           </form>
//         </div>
//       </main>
//     </AppSidebar>
//   );
// }
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { UserPlus, Loader2, Users } from 'lucide-react';
import { getErrorMessage } from '@/lib/get-error-message';

interface UserFormInputs {
  name: string;
  role: string;
}

interface AddMachineUserFormProps {
  onSuccess?: () => void; // Parent component can pass this to trigger a table refresh
}

export default function AddMachineUserForm({ onSuccess }: AddMachineUserFormProps) {
  const [loading, setLoading] = useState(false);
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserFormInputs>({
    defaultValues: { name: '', role: '0' }
  });

  const onSubmit = async (data: UserFormInputs) => {
    setLoading(true);
    try {
      const res = await apiClient.post('/device/users', {
        name: data.name.trim(),
        role: parseInt(data.role, 10),
      });

      if (res.data.success) {
        const generatedId = res.data.employeeId ? ` (ID: ${res.data.employeeId})` : '';
        toast.success((res.data.message || 'User added') + generatedId);
        reset();
        
        // Trigger the parent update lifecycle hook if configured
        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast.error(res.data.message || 'Failed to add user');
      }
    } catch (error: any) {
      toast.error(getErrorMessage(error, 'Failed to add user'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[400px] mx-auto py-4">
      {/* Header Section */}
      <header className="mb-6">
        <div className="flex items-center gap-4 p-1">
          <div className="bg-zinc-50 dark:bg-zinc-900 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50">
            <Users size={20} />
          </div>
          <div>
            <h1 className="text-[14px] font-bold text-zinc-900 dark:text-zinc-50">Register Operator</h1>
            <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Provision new biometric identity</p>
          </div>
        </div>
      </header>

      {/* Main Form Container */}
      <div className="bg-white dark:bg-zinc-950 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-zinc-100 dark:border-zinc-900">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 px-1">
              Full Name
            </label>
            <input
              {...register('name', { required: 'Name is required' })}
              type="text"
              placeholder="e.g. Anil Sharma"
              className={`w-full px-4 py-3 bg-zinc-50/50 dark:bg-zinc-900/50 text-[13px] font-medium text-zinc-900 dark:text-zinc-100 rounded-xl border border-zinc-200 dark:border-zinc-800 transition-all duration-200 outline-none
                ${errors.name 
                  ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/5' 
                  : 'focus:bg-white dark:focus:bg-zinc-950 focus:border-zinc-300 focus:ring-4 focus:ring-zinc-900/5'
                }`}
            />
            {errors.name && <p className="text-[11px] font-medium text-red-500 px-1">{errors.name.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 px-1">
              Device Role
            </label>
            <select
              {...register('role')}
              className="w-full px-4 py-3 bg-zinc-50/50 dark:bg-zinc-900/50 text-[13px] font-medium text-zinc-900 dark:text-zinc-100 rounded-xl border border-zinc-200 dark:border-zinc-800 focus:bg-white dark:focus:bg-zinc-950 focus:border-zinc-300 focus:ring-4 focus:ring-zinc-900/5 transition-all outline-none appearance-none"
            >
              <option value="0">Normal User</option>
              <option value="14">Admin (Super User)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full justify-center bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 rounded-xl py-3 text-xs font-semibold flex items-center gap-2 shadow-lg shadow-zinc-900/20 dark:shadow-none transition-all duration-200 active:scale-[0.98] disabled:opacity-50 mt-2"
          >
            {loading ? (
              <><Loader2 size={14} className="animate-spin" /> Processing...</>
            ) : (
              <><UserPlus size={14} /> Add to Machine</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}