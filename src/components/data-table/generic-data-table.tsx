import { useState } from 'react'
import {
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type RowSelectionState,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DataTablePagination } from './pagination'
import { Input } from '@/components/ui/input'
import { DataTableViewOptions } from './view-options'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  renderToolbarActions?: (table: import('@tanstack/react-table').Table<TData>) => React.ReactNode
}

export function GenericDataTable<TData, TValue>({
  columns,
  data,
  renderToolbarActions,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [globalFilter, setGlobalFilter] = useState('')
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      globalFilter,
      rowSelection,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-2'>
        <div className='flex flex-1 flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto'>
          <Input
            placeholder={`Search all columns...`}
            value={globalFilter ?? ''}
            onChange={(event) => setGlobalFilter(String(event.target.value))}
            className='w-full sm:max-w-sm'
          />
          {renderToolbarActions && renderToolbarActions(table)}
        </div>
        <DataTableViewOptions table={table} />
      </div>
      <div className='rounded-md border hidden md:block'>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className='h-24 text-center'>
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className='flex flex-col gap-4 md:hidden'>
        {table.getRowModel().rows?.length ? (
          table.getRowModel().rows.map((row) => {
            const selectCell = row.getVisibleCells().find(c => c.column.id === 'select');
            const actionsCell = row.getVisibleCells().find(c => c.column.id === 'actions');
            const dataCells = row.getVisibleCells().filter(c => c.column.id !== 'select' && c.column.id !== 'actions' && c.column.id !== 'index');

            return (
              <div key={row.id} className='flex flex-col gap-3 rounded-md border p-4 shadow-sm bg-card text-card-foreground'>
                {/* Header (Select & Actions) */}
                {(selectCell || actionsCell) && (
                  <div className='flex items-center justify-between border-b border-border pb-3'>
                    <div className='flex items-center gap-3'>
                      {selectCell && (
                        <div>
                          {flexRender(selectCell.column.columnDef.cell, selectCell.getContext())}
                        </div>
                      )}
                      <span className='font-semibold text-base line-clamp-1'>
                        {(row.original as { name?: string }).name || 'Data Row'}
                      </span>
                    </div>
                    {actionsCell && (
                      <div className='flex items-center gap-2'>
                        {flexRender(actionsCell.column.columnDef.cell, actionsCell.getContext())}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Data Cells */}
                <div className='grid grid-cols-1 gap-2'>
                  {dataCells.map((cell) => {
                    // Extract label from column id
                    const parts = cell.column.id.split('.');
                    const label = parts[parts.length - 1].replace(/([A-Z])/g, ' $1').trim();
                    
                    return (
                      <div key={cell.id} className='flex flex-col'>
                        <span className='text-xs font-medium text-muted-foreground uppercase'>
                          {label}
                        </span>
                        <div className='text-sm mt-0.5'>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
        ) : (
          <div className='p-4 text-center text-muted-foreground border rounded-md'>
            No results.
          </div>
        )}
      </div>
      <DataTablePagination table={table} />
    </div>
  )
}
