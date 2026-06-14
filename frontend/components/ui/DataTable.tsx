// components/ui/DataTable.tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
  mono?: boolean; // Ensure this matches what you used in the page
  align?: 'left' | 'right' | 'center'; // Ensure this matches what you used in the page
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowId: (item: T) => string | number;
  loading?: boolean;       // Add this
  emptyMessage?: string;   // Add this
}
export function DataTable<T>({ columns, data, rowId }: DataTableProps<T>) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((col, i) => (
            <TableHead key={i} className={col.className}>{col.header}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => (
          <TableRow key={rowId(row)}>
            {columns.map((col, i) => (
              <TableCell key={i}>
                {typeof col.accessor === "function" 
                  ? col.accessor(row) 
                  : String(row[col.accessor])}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}