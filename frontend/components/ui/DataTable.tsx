'use client';
import React from 'react';

export interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
  align?: 'left' | 'center' | 'right';
  mono?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  rowId: (item: T) => string | number;
  onRowClick?: (item: T) => void;
}

export function DataTable<T>({ 
  columns, 
  data, 
  loading = false, 
  emptyMessage = 'No records found.', 
  rowId, 
  onRowClick 
}: DataTableProps<T>) {
  return (
    <div className="bg-zinc-50/50 rounded-2xl p-2 shadow-sm animate-[slide-up_0.25s_ease_both] dark:bg-zinc-900/50">
      <div className="w-full overflow-x-auto scrollbar-none rounded-xl bg-white shadow-xs dark:bg-zinc-950">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-zinc-50/70 dark:bg-zinc-900/40">
              {columns.map((col, i) => {
                const alignmentClass = 
                  col.align === 'right' ? 'text-right' : 
                  col.align === 'center' ? 'text-center' : 'text-left';

                return (
                  <th 
                    key={i} 
                    className={`font-mono text-[10px] font-bold tracking-widest uppercase text-zinc-400 px-6 py-4 dark:text-zinc-500 ${alignmentClass}`}
                  >
                    {col.header}
                  </th>
                );
              })}
            </tr>
          </thead>
          
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="text-center px-6 py-16 text-zinc-400 dark:text-zinc-600">
                  <div className="w-5 h-5 border-2 border-zinc-200 border-t-zinc-900 rounded-full mx-auto mb-3 animate-spin dark:border-zinc-800 dark:border-t-zinc-400" />
                  <span className="font-mono text-[10px] font-bold tracking-widest uppercase text-zinc-500 dark:text-zinc-400">
                    Loading records
                  </span>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center px-6 py-16 font-mono text-xs text-zinc-400 dark:text-zinc-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map(item => {
                const isClickable = Boolean(onRowClick);
                return (
                  <tr 
                    key={rowId(item)} 
                    onClick={() => onRowClick?.(item)}
                    className={`transition-all duration-200 group ${
                      isClickable ? 'cursor-pointer hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40' : 'cursor-default'
                    }`}
                  >
                    {columns.map((col, i) => {
                      const value = typeof col.accessor === 'function'
                        ? col.accessor(item)
                        : (item[col.accessor] as React.ReactNode);

                      const alignmentClass = 
                        col.align === 'right' ? 'text-right' : 
                        col.align === 'center' ? 'text-center' : 'text-left';

                      const fontClass = col.mono 
                        ? 'font-mono text-xs text-zinc-500 dark:text-zinc-400' 
                        : 'font-sans text-[13px] font-medium text-zinc-800 dark:text-zinc-200';

                      return (
                        <td 
                          key={i} 
                          className={`px-6 py-4 align-middle transition-colors duration-200 ${alignmentClass} ${fontClass} ${col.className || ''}`}
                          onClick={(e) => {
                            // Prevents full row click triggers when clicking target buttons in cells
                            if (typeof col.accessor === 'function') {
                              e.stopPropagation();
                            }
                          }}
                        >
                          {value}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}